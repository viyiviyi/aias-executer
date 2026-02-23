import { ConfigManager } from './config';
import { MCPRealClient } from './mcp-real-client';
import { MCPServerInfo, MCPTool, MCPScanResult } from '../types/mcp';

/**
 * 简化的MCP客户端
 * 从应用配置加载服务器，而不是独立的mcp-config.json
 */
export class MCPClientSimple {
  private static instance: MCPClientSimple;
  private configManager: ConfigManager;
  private realClient: MCPRealClient;
  private servers: Map<string, MCPServerInfo> = new Map();
  private tools: Map<string, MCPTool> = new Map();

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.realClient = new MCPRealClient();
    this.loadServersFromAppConfig();
  }

  public static getInstance(): MCPClientSimple {
    if (!MCPClientSimple.instance) {
      MCPClientSimple.instance = new MCPClientSimple();
    }
    return MCPClientSimple.instance;
  }

  /**
   * 从应用配置加载MCP服务器
   */
  private loadServersFromAppConfig(): void {
    const config = this.configManager.getConfig();
    const mcpConfig = config.mcp;
    
    if (!mcpConfig || !mcpConfig.servers) {
      console.log('未找到MCP服务器配置');
      return;
    }

    console.log(`从应用配置加载MCP服务器: ${Object.keys(mcpConfig.servers).length}个`);
    
    for (const [name, serverConfig] of Object.entries(mcpConfig.servers)) {
      const serverInfo: MCPServerInfo = {
        name: serverConfig.name || name,
        description: serverConfig.description || `MCP服务器: ${name}`,
        transport: serverConfig.transport || 'stdio',
        command: serverConfig.command,
        url: serverConfig.url,
        args: serverConfig.args,
        env: serverConfig.env,
        tools: [],
        is_running: false
      };
      
      this.servers.set(name, serverInfo);
      console.log(`加载MCP服务器: ${name} (${serverInfo.description})`);
    }
  }

  /**
   * 启动MCP服务器
   */
  public async startServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, error: `服务器不存在: ${serverName}` };
    }

      console.log(`[MCP客户端简单] 启动服务器 ${serverName}, 传输: ${server.transport}, URL: ${server.url}`);
    try {
      // 连接到服务器
      const connectResult = await this.realClient.connectToServer(serverName, server);
      
      if (connectResult.success) {
        server.is_running = true;
        console.log(`MCP服务器 ${serverName} 启动成功`);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: connectResult.error || '启动MCP服务器失败' 
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '启动MCP服务器时发生错误'
      };
    }
  }

  /**
   * 停止MCP服务器
   */
  public async stopServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, error: `服务器不存在: ${serverName}` };
    }

    try {
      await this.realClient.disconnectFromServer(serverName);
      server.is_running = false;
      console.log(`MCP服务器 ${serverName} 停止成功`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '停止MCP服务器时发生错误'
      };
    }
  }

  /**
   * 扫描MCP服务器获取工具列表
   */
  public async scanServer(serverName: string): Promise<MCPScanResult> {
    const server = this.servers.get(serverName);
    if (!server) {
      return {
        server_name: serverName,
        tools: [],
        success: false,
        error: `服务器不存在: ${serverName}`
      };
    }

    if (!server.is_running) {
      return {
        server_name: serverName,
        tools: [],
        success: false,
        error: `服务器未运行: ${serverName}`
      };
    }

    try {
      const tools = await this.realClient.listTools(serverName);
      
      // 更新服务器工具列表
      server.tools = tools;
      
      // 注册工具到全局工具表
      for (const tool of tools) {
        const fullToolName = `${serverName}__${tool.name}`;
        this.tools.set(fullToolName, {
          ...tool,
          server_name: serverName
        });
      }
      
      return {
        server_name: serverName,
        tools,
        success: true
      };
    } catch (error: any) {
      return {
        server_name: serverName,
        tools: [],
        success: false,
        error: error.message || '扫描MCP服务器失败'
      };
    }
  }

  /**
   * 调用MCP工具
   */
  public async callTool(serverName: string, toolName: string, arguments_: Record<string, any>): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      return {
        success: false,
        error: `服务器不存在: ${serverName}`,
        server_name: serverName,
        tool_name: toolName
      };
    }

    if (!server.is_running) {
      return {
        success: false,
        error: `服务器未运行: ${serverName}`,
        server_name: serverName,
        tool_name: toolName
      };
    }

    try {
      const result = await this.realClient.callTool(serverName, toolName, arguments_);
      
      if (result.success) {
        return {
          success: true,
          result: result.result,
          server_name: serverName,
          tool_name: toolName
        };
      } else {
        return {
          success: false,
          error: result.error || '调用工具失败',
          server_name: serverName,
          tool_name: toolName
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调用MCP工具时发生错误',
        server_name: serverName,
        tool_name: toolName
      };
    }
  }

  /**
   * 列出所有MCP服务器
   */
  public async listServers(): Promise<{ success: boolean; servers?: MCPServerInfo[]; count?: number; error?: string }> {
    const servers = Array.from(this.servers.values());
    return {
      success: true,
      servers,
      count: servers.length
    };
  }

  /**
   * 获取服务器健康状态
   */
  public async getServerHealth(serverName: string): Promise<{ success: boolean; is_healthy?: boolean; error?: string }> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { success: false, error: `服务器不存在: ${serverName}` };
    }

    try {
      const health = await this.realClient.getServerHealth(serverName);
      return {
        success: true,
        is_healthy: health.is_healthy
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取服务器健康状态失败'
      };
    }
  }

  /**
   * 获取连接状态
   */
  public async getConnectionsStatus(): Promise<{ success: boolean; connections?: any[]; error?: string }> {
    try {
      const connections = await this.realClient.getConnectionsStatus();
      return {
        success: true,
        connections
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取连接状态失败'
      };
    }
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<{ success: boolean; error?: string }> {
    try {
      // 停止所有服务器
      for (const [serverName, server] of this.servers) {
        if (server.is_running) {
          await this.stopServer(serverName);
        }
      }
      
      // 清理工具表
      this.tools.clear();
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '清理MCP资源失败'
      };
    }
  }
}