import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpRemoveServerTool: Tool = {
  definition: {
    name: 'mcp_remove_server',
    description: '移除MCP服务器',
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
      const result = await mcpClient.removeServer(serverName);
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '移除MCP服务器失败'
      };
    }
  }
};