import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { ChildProcess } from 'child_process';
import { 
  MCPServerInfo, 
  MCPTool, 
  MCPConnectionInfo,
  MCPConnectionStatus
} from '../types/mcp';

export class MCPRealClient {
  private connections: Map<string, MCPConnectionInfo> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  
  constructor() {}

  /**
   * 连接到MCP服务器
   */
  async connectToServer(
    serverName: string,
    serverInfo: MCPServerInfo
  ): Promise<{ success: boolean; error?: string; client?: Client }> {
    try {
      let transport: StdioClientTransport | StreamableHTTPClientTransport | WebSocketClientTransport;
      let client: Client;

      // 根据传输类型创建不同的传输
      switch (serverInfo.transport) {
        case 'stdio':
          if (!serverInfo.command || serverInfo.command.length === 0) {
            throw new Error('STDIO传输需要配置command');
          }
          
          transport = new StdioClientTransport({
            command: serverInfo.command[0],
            args: [...(serverInfo.command.slice(1) || []), ...(serverInfo.args || [])],
            env: serverInfo.env
          });
          break;

        case 'http':
          if (!serverInfo.url) {
            throw new Error('HTTP传输需要配置url');
          }
          transport = new StreamableHTTPClientTransport(new URL(serverInfo.url));
          break;

        case 'websocket':
          if (!serverInfo.url) {
            throw new Error('WebSocket传输需要配置url');
          }
          transport = new WebSocketClientTransport(new URL(serverInfo.url));
          break;

        default:
          throw new Error(`不支持的传输类型: ${serverInfo.transport}`);
      }

      // 创建MCP客户端
      client = new Client(
        {
          name: 'aias-executor',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // 连接服务器
      await client.connect(transport);

      // 保存连接信息
      this.connections.set(serverName, {
        name: serverName,
        client,
        transport,
        is_connected: true,
        last_heartbeat: new Date(),
        error_count: 0
      });

      return {
        success: true,
        client
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '连接MCP服务器失败'
      };
    }
  }

  /**
   * 断开与MCP服务器的连接
   */
  async disconnectFromServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection) {
        return { success: false, error: `服务器未连接: ${serverName}` };
      }

      if (connection.client) {
        await connection.client.close();
      }

      this.connections.delete(serverName);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '断开MCP服务器连接失败'
      };
    }
  }

  /**
   * 获取服务器工具列表
   */
  async listServerTools(serverName: string): Promise<{ 
    success: boolean; 
    tools?: MCPTool[]; 
    error?: string 
  }> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection || !connection.is_connected) {
        return { 
          success: false, 
          error: `服务器未连接或未就绪: ${serverName}` 
        };
      }

      // 发送tools/list请求
      const response = await connection.client.request('tools/list', {});
      
      const tools: MCPTool[] = (response.tools || []).map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.inputSchema || {},
        server_name: serverName
      }));

      return {
        success: true,
        tools
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取工具列表失败'
      };
    }
  }

  /**
   * 调用MCP工具
   */
  async callTool(
    serverName: string,
    toolName: string,
    arguments_: Record<string, any>
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection || !connection.is_connected) {
        return { 
          success: false, 
          error: `服务器未连接或未就绪: ${serverName}` 
        };
      }

      // 发送tools/call请求
      const response = await connection.client.request('tools/call', {
        name: toolName,
        arguments: arguments_
      });

      // 更新最后活动时间
      connection.last_heartbeat = new Date();

      return {
        success: true,
        result: response
      };
    } catch (error: any) {
      // 增加错误计数
      const connection = this.connections.get(serverName);
      if (connection) {
        connection.error_count++;
      }

      return {
        success: false,
        error: error.message || '调用MCP工具失败'
      };
    }
  }

  /**
   * 心跳检查
   */
  async heartbeat(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection || !connection.is_connected) {
        return { success: false, error: `服务器未连接: ${serverName}` };
      }

      // 发送一个简单的请求检查连接
      await connection.client.request('tools/list', {});
      connection.last_heartbeat = new Date();
      connection.error_count = 0;

      return { success: true };
    } catch (error: any) {
      const connection = this.connections.get(serverName);
      if (connection) {
        connection.error_count++;
        if (connection.error_count > 3) {
          connection.is_connected = false;
        }
      }

      return {
        success: false,
        error: error.message || '心跳检查失败'
      };
    }
  }

  /**
   * 获取所有连接状态
   */
  getAllConnectionsStatus(): MCPConnectionStatus[] {
    const statuses: MCPConnectionStatus[] = [];
    
    for (const [serverName, connection] of this.connections.entries()) {
      const process = this.processes.get(serverName);
      let is_running = false;
      
      if (process) {
        is_running = !process.killed;
      }

      statuses.push({
        server_name: serverName,
        is_connected: connection.is_connected,
        is_running,
        transport_type: connection.transport?.constructor.name.includes('Stdio') ? 'stdio' : 
                       connection.transport?.constructor.name.includes('StreamableHTTP') ? 'http' : 'websocket',
        last_activity: connection.last_heartbeat,
        error: connection.error_count > 0 ? `错误计数: ${connection.error_count}` : undefined,
        pid: process?.pid
      });
    }

    return statuses;
  }

  /**
   * 设置进程引用（用于STDIO传输）
   */
  setProcessReference(serverName: string, process: ChildProcess): void {
    this.processes.set(serverName, process);
  }

  /**
   * 移除进程引用
   */
  removeProcessReference(serverName: string): void {
    this.processes.delete(serverName);
  }

  /**
   * 清理所有连接
   */
  async cleanup(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    
    for (const serverName of this.connections.keys()) {
      disconnectPromises.push(
        this.disconnectFromServer(serverName).then(() => {
          this.processes.delete(serverName);
        })
      );
    }

    await Promise.all(disconnectPromises);
    this.connections.clear();
    this.processes.clear();
  }

  /**
   * 简化方法：获取工具列表
   */
  async listTools(serverName: string): Promise<MCPTool[]> {
    const result = await this.listServerTools(serverName);
    if (result.success && result.tools) {
      return result.tools;
    }
    return [];
  }

  /**
   * 简化方法：获取服务器健康状态
   */
  async getServerHealth(serverName: string): Promise<{ is_healthy: boolean; error?: string }> {
    try {
      const connection = this.connections.get(serverName);
      if (!connection || !connection.is_connected) {
        return { is_healthy: false, error: '服务器未连接' };
      }

      // 尝试发送一个简单请求检查健康状态
      await connection.client.request('tools/list', {});
      return { is_healthy: true };
    } catch (error: any) {
      return { 
        is_healthy: false, 
        error: error.message || '服务器健康检查失败' 
      };
    }
  }

  /**
   * 简化方法：获取连接状态
   */
  async getConnectionsStatus(): Promise<any[]> {
    return this.getAllConnectionsStatus();
  }
}