import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpListToolsTool: Tool = {
  definition: {
    name: 'mcp_list_tools',
    description: '列出所有可用的MCP工具',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(): Promise<any> {
    try {
      const result = mcpClient.listTools();
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '列出MCP工具失败'
      };
    }
  }
};