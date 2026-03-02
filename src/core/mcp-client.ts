
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/WebSocket';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse'
import { ToolRegistry } from './tool-registry';
import { ConfigManager } from './config';
import path from 'path';
import { Tool } from '@/types';

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'http' | 'sse' | 'ws';
  url?: string;
  description?: string;
  disabled?: boolean;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}
/**
 * MCP客户端 - 管理外部MCP服务连接
 */

export class MCPClientManager {
  private static instance: MCPClientManager;
  private clients: Map<string, Client> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();
  private toolRegistry: ToolRegistry;
  private configManager: ConfigManager;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  /**
   * 加载MCP配置
   */
  public async loadConfig(configPath?: string): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const workspacePath = config.workspacePath || process.cwd();

      // 尝试从多个位置加载配置
      const possiblePaths = [
        configPath,
        path.join(workspacePath, 'config', 'mcp-servers.json'),
        path.join(workspacePath, 'mcp-servers.json'),
        path.join(process.cwd(), 'config', 'mcp-servers.json'),
        path.join(process.cwd(), 'mcp-servers.json'),
      ].filter(Boolean) as string[];

      let mcpConfig: MCPConfig | null = null;

      for (const configPath of possiblePaths) {
        try {
          const fs = await import('fs/promises');
          const data = await fs.readFile(configPath, 'utf-8');
          mcpConfig = JSON.parse(data);
          console.log(`✅ 从 ${configPath} 加载MCP配置`);
          break;
        } catch (error) {
          // 继续尝试下一个路径
          continue;
        }
      }

      if (!mcpConfig) {
        console.log('ℹ️ 未找到MCP配置文件，跳过MCP服务加载');
        return;
      }

      // 存储服务器配置
      for (const [serverName, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
        if (serverConfig.disabled) {
          console.log(`⏭️  跳过已禁用的MCP服务: ${serverName}`);
          continue;
        }
        this.serverConfigs.set(serverName, serverConfig);
      }

      console.log(`📋 加载了 ${this.serverConfigs.size} 个MCP服务器配置`);
    } catch (error) {
      console.error('❌ 加载MCP配置失败:', error);
    }
  }

  /**
   * 连接到所有MCP服务器
   */
  public async connectAllServers(): Promise<void> {
    console.log('🔗 开始连接MCP服务器...');

    for (const [serverName, serverConfig] of this.serverConfigs) {
      try {
        await this.connectToServer(serverName, serverConfig);
      } catch (error) {
        console.error(`❌ 连接MCP服务器 ${serverName} 失败:`, error);
      }
    }
  }

  /**
   * 连接到单个MCP服务器
   */
  private async connectToServer(serverName: string, serverConfig: MCPServerConfig): Promise<void> {
    try {
      console.log(`🔗 正在连接MCP服务器: ${serverName}`);

      const client = new Client(
        {
          name: 'aias-executor',
          version: '1.0.0',
        }
      );

      let transport;

      if (serverConfig.type === 'ws' && serverConfig.url) {
        // HTTP传输
        transport = new WebSocketClientTransport(new URL(serverConfig.url));
      } else if (serverConfig.type === 'http' && serverConfig.url) {
        // HTTP传输
        transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
      } else if (serverConfig.type === 'sse' && serverConfig.url) {
        // SSE传输
        try {
          // Try modern Streamable HTTP transport first
          transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
        } catch {
          // Fall back to legacy SSE transport
          transport = new SSEClientTransport(new URL(serverConfig.url));
        }
      } else if (serverConfig.command) {
        // Stdio传输（命令行）
        const env: Record<string, string> = { ...process.env, ...serverConfig.env } as Record<string, string>;

        // 处理npx命令
        let command = serverConfig.command;
        let args = serverConfig.args || [];
        transport = new StdioClientTransport({
          command,
          args,
          env,
        });
      } else {
        throw new Error(`不支持的MCP服务器类型: ${serverConfig.type || 'stdio'}`);
      }

      await client.connect(transport);

      // 获取服务器工具
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools || [];

      console.log(`✅ 连接到MCP服务器: ${serverName}, 获取到 ${tools.length} 个工具`);

      // 注册工具到工具注册表
      for (const tool of tools) {
        await this.registerMCPServerTool(serverName, tool, client);
      }

      this.clients.set(serverName, client);

    } catch (error) {
      console.error(`❌ 连接MCP服务器 ${serverName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 注册MCP服务器工具
   */
  private async registerMCPServerTool(
    serverName: string,
    mcpTool: any,
    client: Client
  ): Promise<void> {
    const toolName = `${serverName}_${mcpTool.name}`;

    const tool: Tool = {
      definition: {
        name: toolName,
        description: mcpTool.description || `来自 ${serverName} MCP服务器的工具`,
        parameters: mcpTool.inputSchema || {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      execute: async (parameters: Record<string, any>) => {
        try {
          console.log(`🛠️  执行MCP工具: ${toolName}`);
          const result = await client.callTool({
            name: mcpTool.name,
            arguments: parameters,
          });

          let resultText: string;
          if (result.content && Array.isArray(result.content) && result.content[0] && result.content[0].text) {
            resultText = result.content[0].text;
          } else if (result.content) {
            resultText = JSON.stringify(result.content);
          } else {
            resultText = JSON.stringify(result) || '执行成功';
          }

          return {
            success: true,
            result: resultText,
            tool: toolName,
          };
        } catch (error) {
          console.error(`❌ 执行MCP工具 ${toolName} 失败:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            tool: toolName,
          };
        }
      },
    };

    this.toolRegistry.registerTool(toolName, tool);
    console.log(`📝 注册MCP工具: ${toolName}`);
  }

  /**
   * 获取所有已连接的MCP服务器
   */
  public getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * 获取所有MCP工具
   */
  public getMCPServerTools(): string[] {
    const mcpTools: string[] = [];
    for (const toolName of this.toolRegistry.getAvailableTools()) {
      if (toolName.includes('_')) {
        mcpTools.push(toolName);
      }
    }
    return mcpTools;
  }

  /**
   * 断开所有MCP服务器连接
   */
  public async disconnectAllServers(): Promise<void> {
    console.log('🔌 断开所有MCP服务器连接...');

    for (const [serverName, client] of this.clients) {
      try {
        await client.close();
        console.log(`✅ 断开MCP服务器: ${serverName}`);

        // 从工具注册表中移除该服务器的所有工具
        const removed = this.toolRegistry.unregisterToolsByPrefix(`${serverName}_`);
        console.log(`🗑️  移除 ${removed.length} 个来自 ${serverName} 的工具`);
      } catch (error) {
        console.error(`❌ 断开MCP服务器 ${serverName} 失败:`, error);
      }
    }

    this.clients.clear();
    this.serverConfigs.clear();
  }

  /**
   * 获取MCP服务器状态
   */
  public getServerStatus(): Array<{
    name: string;
    connected: boolean;
    tools: number;
    description?: string;
  }> {
    const status = [];

    for (const [serverName, serverConfig] of this.serverConfigs) {
      const connected = this.clients.has(serverName);
      const tools = this.getMCPServerTools().filter(tool =>
        tool.startsWith(`${serverName}_`)
      ).length;

      status.push({
        name: serverName,
        connected,
        tools,
        description: serverConfig.description,
      });
    }

    return status;
  }
}