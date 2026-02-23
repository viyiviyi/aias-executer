import { MCPClientSimple } from './mcp-client-simple';
import { ConfigManager } from './config';
import { MCPTool } from '../types/mcp';

/**
 * MCP工具管理器
 * 负责管理MCP服务器和第三方工具，但不自动注册为普通工具
 */
export class MCPToolManager {
  private static instance: MCPToolManager;
  private mcpClient: MCPClientSimple;
  private configManager: ConfigManager;
  private thirdPartyTools: Map<string, MCPTool> = new Map(); // toolName -> MCPTool
  private serverTools: Map<string, MCPTool[]> = new Map(); // serverName -> MCPTool[]
  private autoStartServers: string[] = [];

  private constructor() {
    this.mcpClient = MCPClientSimple.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public static getInstance(): MCPToolManager {
    if (!MCPToolManager.instance) {
      MCPToolManager.instance = new MCPToolManager();
    }
    return MCPToolManager.instance;
  }

  /**
   * 初始化MCP工具管理器
   */
  public async initialize(): Promise<void> {
    console.log('初始化MCP工具管理器...');
    
    // 加载MCP服务器配置
    await this.loadMCPConfig();
    
    // 自动启动配置的服务器
    if (this.autoStartServers.length > 0) {
      console.log('需要自动启动的服务器:', this.autoStartServers);
      await this.autoStartConfiguredServers();
    }
    
    console.log('MCP工具管理器初始化完成');
  }

  /**
   * 加载MCP配置
   */
  private async loadMCPConfig(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const mcpConfig = config.mcp || {};
      
      // 获取需要自动启动的服务器
      this.autoStartServers = mcpConfig.autoStartServers || [];
      
      console.log(`加载MCP配置: ${this.autoStartServers.length}个服务器需要自动启动`);
    } catch (error) {
      console.error('加载MCP配置失败:', error);
    }
  }

  /**
   * 自动启动配置的服务器
   */
  private async autoStartConfiguredServers(): Promise<void> {
    for (const serverName of this.autoStartServers) {
      try {
        console.log(`[MCP工具管理器] 自动启动服务器: ${serverName}`);
        console.log(`[MCP工具管理器] 调用mcpClient.startServer...`);
        
        const result = await this.mcpClient.startServer(serverName);
        console.log(`[MCP工具管理器] startServer结果:`, result);
        
        if (result.success) {
          console.log(`[MCP工具管理器] 服务器 ${serverName} 启动成功，开始扫描工具...`);
          // 等待服务器完全启动
          console.log(`等待服务器 ${serverName} 启动完成...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 扫描服务器获取工具
          await this.scanAndCacheServerTools(serverName);
        } else {
          console.error(`[MCP工具管理器] 服务器 ${serverName} 启动失败:`, result.error);
        }
      } catch (error) {
        console.error(`自动启动MCP服务器 ${serverName} 时出错:`, error);
      }
    }
  }

  /**
   * 扫描并缓存服务器工具
   */
  private async scanAndCacheServerTools(serverName: string): Promise<void> {
    try {
      console.log(`扫描MCP服务器工具: ${serverName}`);
      const scanResult = await this.mcpClient.scanServer(serverName);
      
      if (scanResult.success && scanResult.tools) {
        console.log(`发现 ${scanResult.tools.length} 个工具`);
        
        // 缓存工具
        this.serverTools.set(serverName, scanResult.tools);
        
        // 添加到第三方工具列表
        for (const tool of scanResult.tools) {
          const fullToolName = this.generateToolName(serverName, tool.name);
          this.thirdPartyTools.set(fullToolName, {
            ...tool,
            server_name: serverName
          });
        }
      } else {
        console.error(`扫描MCP服务器 ${serverName} 失败:`, scanResult.error);
      }
    } catch (error) {
      console.error(`扫描MCP服务器 ${serverName} 时出错:`, error);
    }
  }

  /**
   * 生成工具名称
   */
  private generateToolName(serverName: string, toolName: string): string {
    // 使用双下划线分隔，避免冲突
    return `${serverName}__${toolName}`;
  }

  /**
   * 解析工具名称
   */
  private parseToolName(fullToolName: string): { serverName: string; toolName: string } | null {
    const parts = fullToolName.split('__');
    if (parts.length !== 2) {
      return null;
    }
    return {
      serverName: parts[0],
      toolName: parts[1]
    };
  }

  /**
   * 获取所有第三方工具列表
   */
  public getAllThirdPartyTools(): Array<{
    name: string;
    description: string;
    server_name: string;
    input_schema: Record<string, any>;
  }> {
    const tools: Array<{
      name: string;
      description: string;
      server_name: string;
      input_schema: Record<string, any>;
    }> = [];
    
    for (const [fullName, tool] of this.thirdPartyTools) {
      tools.push({
        name: fullName,
        description: tool.description,
        server_name: tool.server_name,
        input_schema: tool.input_schema
      });
    }
    
    return tools;
  }

  /**
   * 执行第三方工具
   */
  public async executeThirdPartyTool(
    toolName: string, 
    parameters: Record<string, any>
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    // 解析工具名称
    const parsed = this.parseToolName(toolName);
    if (!parsed) {
      return {
        success: false,
        error: `工具名称格式错误: ${toolName}，应为 serverName__toolName 格式`
      };
    }
    
    const { serverName, toolName: actualToolName } = parsed;
    
    try {
      // 通过MCP客户端调用工具
      const result = await this.mcpClient.callTool(serverName, actualToolName, parameters);
      
      if (result.success) {
        return {
          success: true,
          result: result.result
        };
      } else {
        return {
          success: false,
          error: result.error || '调用MCP工具失败'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调用MCP工具时发生错误'
      };
    }
  }

  /**
   * 手动启动MCP服务器
   */
  public async startMCPserver(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.mcpClient.startServer(serverName);
      
      if (result.success) {
        // 扫描服务器获取工具
        await this.scanAndCacheServerTools(serverName);
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '启动MCP服务器时发生错误'
      };
    }
  }

  /**
   * 手动停止MCP服务器
   */
  public async stopMCPserver(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.mcpClient.stopServer(serverName);
      
      if (result.success) {
        // 清理缓存的工具
        this.serverTools.delete(serverName);
        
        // 从第三方工具列表中移除
        for (const [fullName, tool] of this.thirdPartyTools) {
          if (tool.server_name === serverName) {
            this.thirdPartyTools.delete(fullName);
          }
        }
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '停止MCP服务器时发生错误'
      };
    }
  }

  /**
   * 获取MCP服务器状态
   */
  public getMCPserverStatus(): Array<{
    name: string;
    is_running: boolean;
    tools_count: number;
  }> {
    const status: Array<{
      name: string;
      is_running: boolean;
      tools_count: number;
    }> = [];
    
    // 这里需要从MCP客户端获取服务器状态
    // 暂时返回基本信息
    for (const [serverName, tools] of this.serverTools) {
      status.push({
        name: serverName,
        is_running: true, // 假设有工具就是运行中
        tools_count: tools.length
      });
    }
    
    return status;
  }

  /**
   * 清理所有MCP工具
   */
  public cleanup(): void {
    this.thirdPartyTools.clear();
    this.serverTools.clear();
    console.log('清理所有MCP工具缓存');
  }
}