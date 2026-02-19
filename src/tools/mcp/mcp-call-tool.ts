import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpCallToolTool: Tool = {
  definition: {
    name: 'mcp_call_tool',
    description: '调用MCP工具',
    parameters: {
      type: 'object',
      properties: {
        tool_name: {
          type: 'string',
          description: '工具名称'
        },
        arguments: {
          type: 'object',
          description: '工具参数'
        }
      },
      required: ['tool_name', 'arguments']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const toolName = parameters.tool_name;
      const arguments_ = parameters.arguments;
      
      const result = await mcpClient.callTool(toolName, arguments_);
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调用MCP工具失败'
      };
    }
  }
};