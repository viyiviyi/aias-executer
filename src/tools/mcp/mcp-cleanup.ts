import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpCleanupTool: Tool = {
  definition: {
    name: 'mcp_cleanup',
    description: '清理所有MCP连接和进程',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(_parameters: Record<string, any>): Promise<any> {
    try {
      await mcpClient.cleanup();
      
      return {
        success: true,
        result: '已清理所有MCP连接和进程'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '清理MCP连接失败'
      };
    }
  }
};