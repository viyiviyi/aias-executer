import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpGetConnectionsStatusTool: Tool = {
  definition: {
    name: 'mcp_get_connections_status',
    description: '获取所有MCP连接状态',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(_parameters: Record<string, any>): Promise<any> {
    try {
      const status = mcpClient.getAllConnectionsStatus();
      
      return {
        success: true,
        result: {
          connections: status,
          count: status.length
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取MCP连接状态失败'
      };
    }
  }
};