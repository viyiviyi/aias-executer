import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpGetServerHealthTool: Tool = {
  definition: {
    name: 'mcp_get_server_health',
    description: '获取MCP服务器健康状态',
    parameters: {
      type: 'object',
      properties: {
        server_name: {
          type: 'string',
          description: '服务器名称'
        }
      },
      required: ['server_name']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const serverName = parameters.server_name;
      const result = await mcpClient.getServerHealth(serverName);
      
      if (result.success) {
        return {
          success: true,
          result: result.health
        };
      } else {
        return {
          success: false,
          error: result.error || '获取服务器健康状态失败'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取MCP服务器健康状态失败'
      };
    }
  }
};