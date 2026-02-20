import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigManager } from './config';
import { MCPRealClient } from './mcp-real-client';
import { MCPConfig, MCPServerInfo, MCPTool, MCPTransportType, MCPScanResult, DiscoveredServer, MCPDiscoveryOptions, MCPHealthStatus } from '../types/mcp';

export class MCPClient {
  private static instance: MCPClient;
  private configManager: ConfigManager;
  private config: MCPConfig;
  private configPath: string;
  private servers: Map<string, MCPServerInfo> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private realClient: MCPRealClient;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    const workspaceDir = this.configManager.getConfig().workspaceDir;
    this.configPath = path.join(workspaceDir, 'mcp-config.json');
    this.config = this.loadConfig();
    this.realClient = new MCPRealClient();
    this.loadServersFromConfig();
  }

  public static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  private loadConfig(): MCPConfig {
    try {
      if (fsSync.existsSync(this.configPath)) {
        const content = fsSync.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('加载MCP配置失败:', error);
    }

    return {
      servers: {},
      version: '1.0'
    };
  }

  private async saveConfig(): Promise<void> {
    try {
      const config: MCPConfig = {
        servers: {},
        version: '1.0'
      };

      for (const [name, server] of this.servers) {
        config.servers[name] = {
          ...server,
          is_running: this.processes.has(name)
        };
      }

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存MCP配置失败:', error);
    }
  }

  private loadServersFromConfig(): void {
    for (const [name, server] of Object.entries(this.config.servers)) {
      this.servers.set(name, server);
      
      if (server.tools) {
        for (const tool of server.tools) {
          this.tools.set(tool.name, tool);
        }
      }
    }
  }

  public async discoverServers(options?: MCPDiscoveryOptions): Promise<{success: boolean; servers: DiscoveredServer[]; error?: string}> {
    try {
      const servers: DiscoveredServer[] = [];
      const discoveryOptions = options || {
        scanNpmGlobal: true,
        scanPipGlobal: true,
        scanCommonPaths: true,
        scanWorkspace: true
      };
      
      // 扫描npm全局包
      if (discoveryOptions.scanNpmGlobal) {
        const npmServers = await this.scanNpmGlobalPackages();
        servers.push(...npmServers);
      }
      
      // 扫描pip/uv全局包
      if (discoveryOptions.scanPipGlobal) {
        const pipServers = await this.scanPipGlobalPackages();
        servers.push(...pipServers);
      }
      
      // 扫描常见路径
      if (discoveryOptions.scanCommonPaths) {
        const commonServers = await this.scanCommonPaths();
        servers.push(...commonServers);
      }
      
      // 扫描工作空间
      if (discoveryOptions.scanWorkspace) {
        const workspaceServers = await this.scanWorkspace();
        servers.push(...workspaceServers);
      }
      
      return { success: true, servers };
    } catch (error: any) {
      return { 
        success: false, 
        servers: [], 
        error: error.message || '发现MCP服务器失败' 
      };
    }
  }

  public async scanServer(serverPath: string, serverType: 'executable' | 'npm' | 'pip' | 'uv' = 'executable'): Promise<MCPScanResult> {
    try {
      // 根据服务器类型构建命令
      let command: string[] = [];
      
      switch (serverType) {
        case 'npm':
          command = ['npx', serverPath];
          break;
        case 'pip':
        case 'uv':
          command = [serverPath];
          break;
        default:
          command = [serverPath];
      }
      
      // 创建临时服务器信息
      const tempServerInfo: MCPServerInfo = {
        name: `temp_scan_${Date.now()}`,
        description: '临时扫描服务器',
        transport: 'stdio',
        command,
        is_running: false
      };
      
      // 尝试连接并获取工具列表
      const connectResult = await this.realClient.connectToServer(tempServerInfo.name, tempServerInfo);
      
      if (!connectResult.success) {
        return {
          server_name: path.basename(serverPath),
          tools: [],
          success: false,
          error: connectResult.error
        };
      }
      
      // 获取工具列表
      const toolsResult = await this.realClient.listServerTools(tempServerInfo.name);
      
      // 断开连接
      await this.realClient.disconnectFromServer(tempServerInfo.name);
      
      if (!toolsResult.success) {
        return {
          server_name: path.basename(serverPath),
          tools: [],
          success: false,
          error: toolsResult.error
        };
      }
      
      return {
        server_name: path.basename(serverPath),
        tools: toolsResult.tools || [],
        success: true
      };
    } catch (error: any) {
      return {
        server_name: path.basename(serverPath),
        tools: [],
        success: false,
        error: error.message || '扫描MCP服务器失败'
      };
    }
  }

  public async addServer(
    name: string,
    description: string = '',
    command?: string[],
    url?: string,
    args?: string[],
    env?: Record<string, string>,
    tools?: MCPTool[]
  ): Promise<{ success: boolean; server_name: string; error?: string }> {
    if (this.servers.has(name)) {
      return { success: false, server_name: name, error: `服务器已存在: ${name}` };
    }

    let transport: MCPTransportType = 'stdio';
    if (url) {
      transport = url.startsWith('ws') ? 'websocket' : 'http';
    }

    const server: MCPServerInfo = {
      name,
      description,
      transport,
      command,
      url,
      args,
      env,
      tools: tools || [],
      is_running: false
    };

    this.servers.set(name, server);
    
    if (tools) {
      for (const tool of tools) {
        this.tools.set(tool.name, { ...tool, server_name: name });
      }
    }

    await this.saveConfig();

    return {
      success: true,
      server_name: name
    };
  }

  public async startServer(serverName: string): Promise<{ success: boolean; server_name: string; pid?: number; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, server_name: serverName, error: `服务器不存在: ${serverName}` };
    }

    if (this.processes.has(serverName)) {
      return { success: false, server_name: serverName, error: `服务器已在运行: ${serverName}` };
    }

    try {
      // 对于STDIO传输，需要启动进程
      if (server.transport === 'stdio' && server.command) {
        const fullEnv = { ...process.env, ...server.env };
        const childProcess = spawn(server.command[0], [...(server.command.slice(1) || []), ...(server.args || [])], {
          env: fullEnv,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.processes.set(serverName, childProcess);
        server.is_running = true;
        
        // 设置进程引用到realClient
        this.realClient.setProcessReference(serverName, childProcess);

        // 监听进程退出
        childProcess.on('exit', () => {
          this.processes.delete(serverName);
          server.is_running = false;
          this.realClient.removeProcessReference(serverName);
          this.saveConfig();
        });

        // 等待一段时间让服务器启动
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 连接到服务器
        const connectResult = await this.realClient.connectToServer(serverName, server);
        if (!connectResult.success) {
          childProcess.kill();
          this.processes.delete(serverName);
          server.is_running = false;
          return { 
            success: false, 
            server_name: serverName, 
            error: connectResult.error 
          };
        }

        await this.saveConfig();
        return {
          success: true,
          server_name: serverName,
          pid: childProcess.pid
        };
      } else {
        // 对于HTTP/WebSocket传输，直接连接
        const connectResult = await this.realClient.connectToServer(serverName, server);
        if (!connectResult.success) {
          return { 
            success: false, 
            server_name: serverName, 
            error: connectResult.error 
          };
        }

        server.is_running = true;
        await this.saveConfig();
        return {
          success: true,
          server_name: serverName
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        server_name: serverName, 
        error: error.message || '启动MCP服务器失败' 
      };
    }
  }

  public async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { 
        success: false, 
        error: `工具不存在: ${toolName}`,
        tool_name: toolName
      };
    }

    const server = this.servers.get(tool.server_name);
    if (!server) {
      return { 
        success: false, 
        error: `服务器不存在: ${tool.server_name}`,
        tool_name: toolName,
        server_name: tool.server_name
      };
    }

    try {
      // 使用realClient调用工具
      const result = await this.realClient.callTool(tool.server_name, toolName, arguments_);
      
      if (result.success) {
        return {
          success: true,
          result: result.result,
          server_name: tool.server_name,
          tool_name: toolName
        };
      } else {
        return {
          success: false,
          error: result.error || '调用工具失败',
          server_name: tool.server_name,
          tool_name: toolName
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调用MCP工具失败',
        server_name: tool.server_name,
        tool_name: toolName
      };
    }
  }

  public listTools(): {success: boolean; tools: MCPTool[]; count: number} {
    try {
      const tools = Array.from(this.tools.values());
      return {
        success: true,
        tools,
        count: tools.length
      };
    } catch (error: any) {
      return {
        success: false,
        tools: [],
        count: 0
      };
    }
  }

  public listServers(): {success: boolean; servers: MCPServerInfo[]; count: number} {
    try {
      const servers = Array.from(this.servers.values());
      return {
        success: true,
        servers,
        count: servers.length
      };
    } catch (error: any) {
      return {
        success: false,
        servers: [],
        count: 0
      };
    }
  }

  public getServer(serverName: string): MCPServerInfo | undefined {
    return this.servers.get(serverName);
  }

  public getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  public async stopServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, error: `服务器不存在: ${serverName}` };
    }

    try {
      // 断开与realClient的连接
      await this.realClient.disconnectFromServer(serverName);
      
      // 停止进程（如果存在）
      const childProcess = this.processes.get(serverName);
      if (childProcess) {
        childProcess.kill();
        this.processes.delete(serverName);
        this.realClient.removeProcessReference(serverName);
      }
      
      server.is_running = false;
      await this.saveConfig();
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '停止MCP服务器失败' 
      };
    }
  }

  public async removeServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, error: `服务器不存在: ${serverName}` };
    }

    // 如果服务器正在运行，先停止
    if (this.processes.has(serverName)) {
      await this.stopServer(serverName);
    }

    // 移除相关工具
    for (const [toolName, tool] of this.tools.entries()) {
      if (tool.server_name === serverName) {
        this.tools.delete(toolName);
      }
    }

    // 移除服务器
    this.servers.delete(serverName);
    await this.saveConfig();

    return { success: true };
  }

  /**
   * 扫描npm全局包中的MCP服务器
   */
  private async scanNpmGlobalPackages(): Promise<DiscoveredServer[]> {
    const servers: DiscoveredServer[] = [];
    
    try {
      // 常见的MCP服务器npm包
      const commonMcpPackages = [
        '@modelcontextprotocol/server-filesystem',
        '@modelcontextprotocol/server-browser',
        '@modelcontextprotocol/server-git',
        'mcp-server-filesystem',
        'mcp-server-browser',
        'mcp-server-git',
        'chrome-automation-mcp-full',
        'better-playwright-mcp'
      ];
      
      for (const pkg of commonMcpPackages) {
        servers.push({
          name: pkg,
          path: pkg,
          type: 'npm',
          command: ['npx', pkg],
          description: `MCP服务器: ${pkg}`
        });
      }
    } catch (error) {
      console.error('扫描npm全局包失败:', error);
    }
    
    return servers;
  }

  /**
   * 扫描pip/uv全局包中的MCP服务器
   */
  private async scanPipGlobalPackages(): Promise<DiscoveredServer[]> {
    const servers: DiscoveredServer[] = [];
    
    try {
      // 常见的Python MCP服务器包
      const commonPythonPackages = [
        'mcp-server-git',
        'mcp-server-postgres',
        'mcp-server-sqlite'
      ];
      
      for (const pkg of commonPythonPackages) {
        servers.push({
          name: pkg,
          path: pkg,
          type: 'pip',
          command: [pkg],
          description: `Python MCP服务器: ${pkg}`
        });
      }
    } catch (error) {
      console.error('扫描pip全局包失败:', error);
    }
    
    return servers;
  }

  /**
   * 扫描常见路径中的MCP服务器
   */
  private async scanCommonPaths(): Promise<DiscoveredServer[]> {
    const servers: DiscoveredServer[] = [];
    
    try {
      // 常见MCP服务器路径
      const commonPaths = [
        '/usr/local/bin/mcp-server-filesystem',
        '/usr/local/bin/chrome-automation-mcp-full',
        '/usr/local/bin/better-playwright-mcp',
        path.join(process.env.HOME || '', '.local/bin/mcp-server-filesystem'),
        path.join(process.env.HOME || '', '.local/bin/chrome-automation-mcp-full')
      ];
      
      for (const serverPath of commonPaths) {
        if (fsSync.existsSync(serverPath)) {
          servers.push({
            name: path.basename(serverPath),
            path: serverPath,
            type: 'executable',
            command: [serverPath],
            description: `可执行MCP服务器: ${path.basename(serverPath)}`
          });
        }
      }
    } catch (error) {
      console.error('扫描常见路径失败:', error);
    }
    
    return servers;
  }

  /**
   * 扫描工作空间中的MCP服务器
   */
  private async scanWorkspace(): Promise<DiscoveredServer[]> {
    const servers: DiscoveredServer[] = [];
    const workspaceDir = this.configManager.getConfig().workspaceDir;
    
    try {
      // 扫描工作空间中的package.json文件
      const packageJsonPath = path.join(workspaceDir, 'package.json');
      if (fsSync.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fsSync.readFileSync(packageJsonPath, 'utf-8'));
        
        // 检查是否有MCP相关的脚本
        if (packageJson.scripts) {
          for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
            if (typeof scriptCommand === 'string' && 
                (scriptCommand.includes('mcp') || scriptName.includes('mcp'))) {
              servers.push({
                name: `workspace-${scriptName}`,
                path: workspaceDir,
                type: 'npm',
                command: ['npm', 'run', scriptName],
                description: `工作空间MCP脚本: ${scriptName}`
              });
            }
          }
        }
      }
      
      // 扫描工作空间中的Python MCP服务器
      const pythonFiles = await this.findPythonMcpFiles(workspaceDir);
      for (const pythonFile of pythonFiles) {
        servers.push({
          name: path.basename(pythonFile, '.py'),
          path: pythonFile,
          type: 'executable',
          command: ['python', pythonFile],
          description: `Python MCP服务器: ${path.basename(pythonFile)}`
        });
      }
    } catch (error) {
      console.error('扫描工作空间失败:', error);
    }
    
    return servers;
  }

  /**
   * 查找Python MCP服务器文件
   */
  private async findPythonMcpFiles(dir: string): Promise<string[]> {
    const mcpFiles: string[] = [];
    
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          // 递归扫描子目录
          const subFiles = await this.findPythonMcpFiles(fullPath);
          mcpFiles.push(...subFiles);
        } else if (file.isFile() && file.name.endsWith('.py')) {
          // 检查文件内容是否包含MCP相关关键词
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            if (content.includes('mcp') || 
                content.includes('ModelContextProtocol') ||
                content.includes('MCP')) {
              mcpFiles.push(fullPath);
            }
          } catch (error) {
            // 忽略读取失败的文件
          }
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }
    
    return mcpFiles;
  }

  /**
   * 获取服务器健康状态
   */
  public async getServerHealth(serverName: string): Promise<{ success: boolean; health?: MCPHealthStatus; error?: string }> {
    try {
      const server = this.servers.get(serverName);
      if (!server) {
        return { 
          success: false, 
          error: `服务器不存在: ${serverName}` 
        };
      }

      // 获取服务器状态
      const statusResult = await this.realClient.getServerStatus(serverName);
      if (!statusResult.success) {
        return { 
          success: false, 
          error: statusResult.error 
        };
      }

      // 心跳检查
      const heartbeatResult = await this.realClient.heartbeatCheck(serverName);
      
      // 获取工具数量
      let toolsCount = 0;
      if (heartbeatResult.is_alive) {
        const toolsResult = await this.realClient.listServerTools(serverName);
        if (toolsResult.success) {
          toolsCount = toolsResult.tools?.length || 0;
        }
      }

      const healthStatus: MCPHealthStatus = {
        server_name: serverName,
        is_healthy: heartbeatResult.is_alive || false,
        last_check: new Date(),
        error: heartbeatResult.error,
        tools_count: toolsCount,
        uptime: statusResult.status?.last_activity ? 
          Date.now() - statusResult.status.last_activity.getTime() : undefined
      };

      return {
        success: true,
        health: healthStatus
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取服务器健康状态失败'
      };
    }
  }

  /**
   * 获取所有连接状态
   */
  public getAllConnectionsStatus(): any[] {
    return this.realClient.getAllConnectionsStatus();
  }

  /**
   * 清理所有连接
   */
  public async cleanup(): Promise<void> {
    await this.realClient.cleanup();
    
    // 停止所有进程
    for (const [, process] of this.processes.entries()) {
      try {
        process.kill();
      } catch (error) {
        // 忽略错误
      }
    }
    
    this.processes.clear();
    
    // 更新服务器状态
    for (const server of this.servers.values()) {
      server.is_running = false;
    }
    
    await this.saveConfig();
  }
}