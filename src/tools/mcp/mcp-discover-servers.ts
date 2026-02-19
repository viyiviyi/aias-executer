import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpDiscoverServersTool: Tool = {
  definition: {
    name: 'mcp_discover_servers',
    description: '自动发现MCP服务器',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(): Promise<any> {
    try {
      const result = await mcpClient.discoverServers();
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发现MCP服务器失败'
      };
    }
  }
};