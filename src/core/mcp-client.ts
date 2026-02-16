import fs from 'fs/promises';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigManager } from './config';
import { MCPConfig, MCPServerInfo, MCPTool, MCPTransportType, MCPDiscoveryResult, MCPScanResult } from '../types/mcp';

export class MCPClient {
  private static instance: MCPClient;
  private configManager: ConfigManager;
  private config: MCPConfig;
  private configPath: string;
  private servers: Map<string, MCPServerInfo> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private processes: Map<string, ChildProcess> = new Map();

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    const workspaceDir = this.configManager.getConfig().workspaceDir;
    this.configPath = path.join(workspaceDir, 'mcp-config.json');
    this.config = this.loadConfig();
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
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
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

  public async discoverServers(): Promise<MCPDiscoveryResult> {
    const servers: Array<{ name: string; path: string; type: 'executable' | 'npm' | 'pip' }> = [];
    
    // 这里可以添加自动发现逻辑
    // 例如：检查常见MCP服务器路径、npm全局包、pip包等
    
    return { servers };
  }

  public async scanServer(serverPath: string, serverType: 'executable' | 'npm' | 'pip' = 'executable'): Promise<MCPScanResult> {
    try {
      // 这里应该实现实际的MCP服务器扫描逻辑
      // 由于MCP协议复杂，这里返回模拟数据
      const tools: MCPTool[] = [
        {
          name: 'example_tool',
          description: '示例MCP工具',
          input_schema: {
            type: 'object',
            properties: {
              param: { type: 'string', description: '示例参数' }
            }
          },
          server_name: 'example_server'
        }
      ];

      return {
        server_name: path.basename(serverPath),
        tools,
        success: true
      };
    } catch (error: any) {
      return {
        server_name: path.basename(serverPath),
        tools: [],
        success: false,
        error: error.message
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
  ): Promise<{ success: boolean; server_name: string }> {
    if (this.servers.has(name)) {
      throw new Error(`服务器已存在: ${name}`);
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

  public async startServer(serverName: string): Promise<{ success: boolean; server_name: string; pid?: number }> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`服务器不存在: ${serverName}`);
    }

    if (this.processes.has(serverName)) {
      throw new Error(`服务器已在运行: ${serverName}`);
    }

    if (server.transport !== 'stdio' || !server.command) {
      throw new Error(`服务器 ${serverName} 不支持STDIO传输或未配置命令`);
    }

    try {
      const env = { ...process.env, ...server.env };
      const process = spawn(server.command[0], [...(server.command.slice(1) || []), ...(server.args || [])], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.processes.set(serverName, process);
      server.is_running = true;

      // 监听进程退出
      process.on('exit', () => {
        this.processes.delete(serverName);
        server.is_running = false;
      });

      await this.saveConfig();

      return {
        success: true,
        server_name: serverName,
        pid: process.pid
      };
    } catch (error: any) {
      throw new Error(`启动服务器失败: ${error.message}`);
    }
  }

  public async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`工具不存在: ${toolName}`);
    }

    const server = this.servers.get(tool.server_name);
    if (!server) {
      throw new Error(`服务器不存在: ${tool.server_name}`);
    }

    // 这里应该实现实际的MCP工具调用逻辑
    // 由于MCP协议复杂，这里返回模拟结果
    return {
      success: true,
      result: `调用工具 ${toolName} 成功，参数: ${JSON.stringify(arguments_)}`,
      server_name: tool.server_name,
      tool_name: toolName
    };
  }

  public listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public listServers(): MCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  public getServer(serverName: string): MCPServerInfo | undefined {
    return this.servers.get(serverName);
  }

  public getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  public async stopServer(serverName: string): Promise<{ success: boolean }> {
    const process = this.processes.get(serverName);
    if (!process) {
      throw new Error(`服务器未运行: ${serverName}`);
    }

    try {
      process.kill();
      this.processes.delete(serverName);
      
      const server = this.servers.get(serverName);
      if (server) {
        server.is_running = false;
      }

      await this.saveConfig();

      return { success: true };
    } catch (error: any) {
      throw new Error(`停止服务器失败: ${error.message}`);
    }
  }

  public async removeServer(serverName: string): Promise<{ success: boolean }> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`服务器不存在: ${serverName}`);
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
}