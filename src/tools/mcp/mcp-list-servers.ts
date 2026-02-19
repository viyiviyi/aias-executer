import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpListServersTool: Tool = {
  definition: {
    name: 'mcp_list_servers',
    description: '列出所有已配置的MCP服务器',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(): Promise<any> {
    try {
      const result = mcpClient.listServers();
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '列出MCP服务器失败'
      };
    }
  }
};