import { ToolDefinition } from '../../types';
import { MCPToolManager } from '../../core/mcp-tool-manager';

/**
 * 执行第三方工具
 * 执行MCP服务器提供的工具
 */
export const executeThirdPartyToolTool = {
  definition: {
    name: 'execute_third_party_tool',
    description: '执行第三方工具（MCP工具）',
    parameters: {
      type: 'object',
      properties: {
        tool_name: {
          type: 'string',
          description: '工具名称，格式为 serverName__toolName'
        },
        parameters: {
          type: 'object',
          description: '工具参数',
          additionalProperties: true
        }
      },
      required: ['tool_name']
    }
  } as ToolDefinition,
  
  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const { tool_name, parameters: toolParameters = {} } = parameters;
      
      if (!tool_name) {
        return {
          success: false,
          error: 'tool_name参数是必需的'
        };
      }
      
      const mcpToolManager = MCPToolManager.getInstance();
      
      // 执行第三方工具
      const result = await mcpToolManager.executeThirdPartyTool(tool_name, toolParameters);
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '执行第三方工具失败'
      };
    }
  }
};