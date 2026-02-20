import { MCPClientSimple } from './mcp-client-simple';
import { ToolRegistry } from './tool-registry';
import { ConfigManager } from './config';
import { MCPTool } from '../types/mcp';
import { ToolDefinition } from '../types';

/**
 * MCP工具管理器
 * 负责将MCP工具自动注册为普通工具
 */
export class MCPToolManager {
  private static instance: MCPToolManager;
  private mcpClient: MCPClientSimple;
  private toolRegistry: ToolRegistry;
  private configManager: ConfigManager;
  private registeredTools: Map<string, string> = new Map(); // toolName -> serverName
  private autoStartServers: string[] = [];

  private constructor() {
    this.mcpClient = MCPClientSimple.getInstance();
    this.toolRegistry = ToolRegistry.getInstance();
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
        console.log(`自动启动MCP服务器: ${serverName}`);
        const result = await this.mcpClient.startServer(serverName);
        
        if (result.success) {
          console.log(`MCP服务器 ${serverName} 启动成功`);
          
          // 扫描服务器获取工具
          await this.scanAndRegisterServerTools(serverName);
        } else {
          console.error(`MCP服务器 ${serverName} 启动失败:`, result.error);
        }
      } catch (error) {
        console.error(`自动启动MCP服务器 ${serverName} 时出错:`, error);
      }
    }
  }

  /**
   * 扫描并注册服务器工具
   */
  private async scanAndRegisterServerTools(serverName: string): Promise<void> {
    try {
      console.log(`扫描MCP服务器工具: ${serverName}`);
      const scanResult = await this.mcpClient.scanServer(serverName);
      
      if (scanResult.success && scanResult.tools) {
        console.log(`发现 ${scanResult.tools.length} 个工具`);
        await this.registerServerTools(serverName, scanResult.tools);
      } else {
        console.error(`扫描MCP服务器 ${serverName} 失败:`, scanResult.error);
      }
    } catch (error) {
      console.error(`扫描MCP服务器 ${serverName} 时出错:`, error);
    }
  }

  /**
   * 注册服务器工具
   */
  private async registerServerTools(serverName: string, tools: MCPTool[]): Promise<void> {
    for (const tool of tools) {
      await this.registerMCPTool(serverName, tool);
    }
  }

  /**
   * 注册单个MCP工具
   */
  private async registerMCPTool(serverName: string, mcpTool: MCPTool): Promise<void> {
    const toolName = this.generateToolName(serverName, mcpTool.name);
    
    // 创建工具定义
    const toolDefinition: ToolDefinition = {
      name: toolName,
      description: `${mcpTool.description} (来自MCP服务器: ${serverName})`,
      parameters: {
        type: 'object',
        properties: mcpTool.input_schema.properties || {},
        required: mcpTool.input_schema.required || []
      }
    };

    // 创建工具执行函数
    const executeFunction = async (parameters: Record<string, any>): Promise<any> => {
      try {
        // 通过MCP客户端调用工具
        const result = await this.mcpClient.callTool(serverName, mcpTool.name, parameters);
        
        if (result.success) {
          return {
            success: true,
            result: result.result,
            metadata: {
              server_name: serverName,
              tool_name: mcpTool.name,
              source: 'mcp'
            }
          };
        } else {
          return {
            success: false,
            error: result.error || '调用MCP工具失败',
            metadata: {
              server_name: serverName,
              tool_name: mcpTool.name,
              source: 'mcp'
            }
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message || '调用MCP工具时发生错误',
          metadata: {
            server_name: serverName,
            tool_name: mcpTool.name,
            source: 'mcp'
          }
        };
      }
    };

    // 注册工具
    this.toolRegistry.registerTool(toolDefinition, executeFunction);
    this.registeredTools.set(toolName, serverName);
    
    console.log(`注册MCP工具: ${toolName}`);
  }

  /**
   * 生成工具名称
   */
  private generateToolName(serverName: string, toolName: string): string {
    // 使用双下划线分隔，避免冲突
    return `${serverName}__${toolName}`;
  }

  /**
   * 获取所有已注册的MCP工具
   */
  public getRegisteredTools(): Map<string, string> {
    return new Map(this.registeredTools);
  }

  /**
   * 清理所有MCP工具
   */
  public cleanup(): void {
    for (const [toolName] of this.registeredTools) {
      this.toolRegistry.unregisterTool(toolName);
    }
    this.registeredTools.clear();
    console.log('清理所有MCP工具');
  }
}