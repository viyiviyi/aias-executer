import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/WebSocket.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ToolRegistry } from './tool-registry';
import { ConfigManager } from './config';
import path from 'path';
import { Tool } from '@/types';

/**
 * MCP 服务器认证配置
 */
export interface MCPAuthConfig {
  /** 认证类型 */
  type?: 'bearer' | 'apikey' | 'basic' | 'oauth2' | 'custom';
  
  /** Bearer Token (用于 bearer 类型) */
  bearerToken?: string;
  
  /** API Key 配置 (用于 apikey 类型) */
  apiKey?: {
    key: string;
    value: string;
    headerName?: string; // 默认 'X-API-Key'
  };
  
  /** Basic Auth 配置 (用于 basic 类型) */
  basic?: {
    username: string;
    password: string;
  };
  
  /** OAuth2 配置 (用于 oauth2 类型) */
  oauth2?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes?: string[];
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number; // Unix timestamp
  };
  
  /** 自定义认证头 (用于 custom 类型或额外头) */
  customHeaders?: Record<string, string>;
}

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'http' | 'sse' | 'ws';
  url?: string;
  description?: string;
  disabled?: boolean;
  toolConf?: Record<string, Record<string, any>>;
  headers?: Record<string, string>;
  cwd?: string;
  
  /** 认证配置 */
  auth?: MCPAuthConfig;
  
  /** 请求超时时间（毫秒） */
  timeout?: number;
  
  /** 是否启用自动重连 */
  autoReconnect?: boolean;
  
  /** 最大重试次数 */
  maxRetries?: number;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}
/**
 * MCP 认证管理器 - 处理各种认证方式
 */
class MCPAuthManager {
  /**
   * 根据配置构建请求头
   */
  public static buildHeaders(config: MCPServerConfig): Record<string, string> {
    const headers: Record<string, string> = { ...config.headers };

    if (!config.auth) {
      return headers;
    }

    const auth = config.auth;

    // Bearer Token 认证
    if (auth.type === 'bearer' && auth.bearerToken) {
      headers['Authorization'] = `Bearer ${auth.bearerToken}`;
    }

    // API Key 认证
    if (auth.type === 'apikey' && auth.apiKey) {
      const headerName = auth.apiKey.headerName || 'X-API-Key';
      headers[headerName] = auth.apiKey.value;
    }

    // Basic Auth 认证
    if (auth.type === 'basic' && auth.basic) {
      const credentials = Buffer.from(
        `${auth.basic.username}:${auth.basic.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // OAuth2 认证
    if (auth.type === 'oauth2' && auth.oauth2) {
      const token = this.getOAuth2Token(auth.oauth2);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // 自定义认证头
    if (auth.customHeaders) {
      Object.assign(headers, auth.customHeaders);
    }

    return headers;
  }

  /**
   * 获取 OAuth2 Token（带自动刷新）
   */
  private static async getOAuth2Token(oauth2: NonNullable<MCPAuthConfig['oauth2']>): Promise<string | null> {
    // 检查 token 是否过期
    if (oauth2.accessToken && oauth2.expiresAt) {
      const now = Date.now();
      const expiresIn = oauth2.expiresAt - now;
      
      // 如果 token 还有超过 5 分钟有效期，直接使用
      if (expiresIn > 5 * 60 * 1000) {
        return oauth2.accessToken;
      }
    }

    // Token 已过期或即将过期，需要刷新
    try {
      const newToken = await this.refreshOAuth2Token(oauth2);
      return newToken;
    } catch (error) {
      console.error('❌ OAuth2 Token 刷新失败:', error);
      return oauth2.accessToken || null;
    }
  }

  /**
   * 刷新 OAuth2 Token
   */
  private static async refreshOAuth2Token(oauth2: NonNullable<MCPAuthConfig['oauth2']>): Promise<string> {
    const axios = await import('axios');
    
    const params = new URLSearchParams();
    params.append('grant_type', oauth2.refreshToken ? 'refresh_token' : 'client_credentials');
    params.append('client_id', oauth2.clientId);
    params.append('client_secret', oauth2.clientSecret);
    
    if (oauth2.refreshToken) {
      params.append('refresh_token', oauth2.refreshToken);
    }
    
    if (oauth2.scopes && oauth2.scopes.length > 0) {
      params.append('scope', oauth2.scopes.join(' '));
    }

    const response = await axios.default.post(oauth2.tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data;
    
    // 更新 OAuth2 配置
    oauth2.accessToken = data.access_token;
    oauth2.refreshToken = data.refresh_token || oauth2.refreshToken;
    
    if (data.expires_in) {
      oauth2.expiresAt = Date.now() + (data.expires_in * 1000);
    }

    console.log('✅ OAuth2 Token 刷新成功');
    return data.access_token;
  }

  /**
   * 验证认证配置是否有效
   */
  public static validateAuthConfig(auth?: MCPAuthConfig): boolean {
    if (!auth) return true;

    switch (auth.type) {
      case 'bearer':
        return !!auth.bearerToken;
      case 'apikey':
        return !!(auth.apiKey && auth.apiKey.key && auth.apiKey.value);
      case 'basic':
        return !!(auth.basic && auth.basic.username && auth.basic.password);
      case 'oauth2':
        return !!(auth.oauth2 && auth.oauth2.clientId && auth.oauth2.clientSecret && auth.oauth2.tokenUrl);
      case 'custom':
        return !!auth.customHeaders;
      default:
        return true;
    }
  }
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
      const workspacePath = config.workspaceDir || process.cwd();

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

      // 验证认证配置
      if (serverConfig.auth && !MCPAuthManager.validateAuthConfig(serverConfig.auth)) {
        console.warn(`⚠️  MCP服务器 ${serverName} 的认证配置无效，将跳过认证`);
      }

      // 构建请求头（包含认证信息）
      const headers = MCPAuthManager.buildHeaders(serverConfig);

      const client = new Client({
        name: 'aias-executor',
        version: '1.0.0',
      });

      let transport;

      if (serverConfig.type === 'ws' && serverConfig.url) {
        // WebSocket传输
        const wsUrl = new URL(serverConfig.url);
        // WebSocket 需要通过 URL 查询参数传递认证信息
        // 将headers中的认证信息添加到URL查询参数
        if (headers['Authorization']) {
          const authValue = headers['Authorization'];
          if (authValue.startsWith('Bearer ')) {
            wsUrl.searchParams.set('token', authValue.substring(7));
          } else if (authValue.startsWith('Basic ')) {
            wsUrl.searchParams.set('auth', authValue.substring(6));
          }
        }
        // 也支持自定义的token参数
        if (headers['X-API-Key']) {
          wsUrl.searchParams.set('api_key', headers['X-API-Key']);
        }
        transport = new WebSocketClientTransport(wsUrl);
      } else if (serverConfig.type === 'http' && serverConfig.url) {
        // HTTP传输
        transport = new StreamableHTTPClientTransport(new URL(serverConfig.url), { 
          requestInit: { headers } 
        });
      } else if (serverConfig.type === 'sse' && serverConfig.url) {
        // SSE传输 - 使用传统SSE协议
        transport = new SSEClientTransport(new URL(serverConfig.url), { 
          requestInit: { headers } 
        });
      } else if (serverConfig.command) {
        // Stdio传输（命令行）
        const env: Record<string, string> = { ...process.env, ...serverConfig.env } as Record<
          string,
          string
        >;

        // 处理npx命令
        let command = serverConfig.command;
        let args = serverConfig.args || [];
        transport = new StdioClientTransport({
          command,
          args,
          env,
          ...(serverConfig.cwd && { cwd: serverConfig.cwd }),
        });
      } else {
        throw new Error(`不支持的MCP服务器类型: ${serverConfig.type || 'stdio'}`);
      }

      // 设置超时
      const timeout = serverConfig.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`连接超时 (${timeout}ms)`)), timeout);
      });

      // 带重试的连接逻辑
      const maxRetries = serverConfig.maxRetries || 3;
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await Promise.race([client.connect(transport), timeoutPromise]);
          console.log(`✅ 成功连接到MCP服务器: ${serverName}${attempt > 1 ? ` (第${attempt}次尝试)` : ''}`);
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 指数退避
            console.warn(`⚠️  连接尝试 ${attempt}/${maxRetries} 失败: ${lastError.message}`);
            console.log(`🔄 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      // 获取服务器工具
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools || [];

      console.log(`✅ 连接到MCP服务器: ${serverName}, 获取到 ${tools.length} 个工具`);

      // 注册工具到工具注册表
      console.log(`📝 注册工具`);
      for (const tool of tools) {
        await this.registerMCPServerTool(serverName, tool, client, serverConfig);
      }

      this.clients.set(serverName, client);
    } catch (error) {
      console.error(`❌ 连接MCP服务器 ${serverName} 失败:`, error);
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.error(`🔐 认证失败: 请检查 ${serverName} 的认证配置`);
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          console.error(`🚫 访问被拒绝: 请检查 ${serverName} 的权限配置`);
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connect ECONNREFUSED')) {
          console.error(`🌐 连接被拒绝: 请检查 ${serverName} 的URL和网络连接`);
        }
      }
      
      throw error;
    }
  }

  /**
   * 注册MCP服务器工具
   */
  private async registerMCPServerTool(
    serverName: string,
    mcpTool: any,
    client: Client,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    const toolName = `${serverName}_${mcpTool.name}`;
    
    // 将MCP的inputSchema转换为标准的parameters格式
    const parameters: { type: 'object'; properties: Record<string, any>; required?: string[] } = mcpTool.inputSchema ? {
      type: 'object',
      properties: mcpTool.inputSchema.properties || {},
      required: mcpTool.inputSchema.required || [],
    } : { type: 'object', properties: {}, required: [] };
    
    const tool: Tool = {
      definition: {
        name: toolName,
        description: mcpTool.description || '',
        groupName: serverName,
        parameters: parameters,
        ...(serverConfig.toolConf && serverConfig.toolConf[toolName || mcpTool.name]),
      },
      execute: async (parameters: Record<string, any>) => {
        try {
          const result = await client.callTool({
            name: mcpTool.name,
            arguments: parameters,
          });

          return result.content ? result.content : result;
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
      const tools = this.getMCPServerTools().filter((tool) =>
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
