import { ToolDefinition } from '../../types';
import { MCPToolManager } from '../../core/mcp-tool-manager';

/**
 * 获取第三方工具列表
 * 返回所有MCP服务器提供的工具列表
 */
export const getThirdPartyToolsTool = {
  definition: {
    name: 'get_third_party_tools',
    description: '获取所有第三方工具（MCP工具）列表',
    parameters: {
      type: 'object',
      properties: {
        server_name: {
          type: 'string',
          description: '可选：指定服务器名称，只返回该服务器的工具'
        },
        include_details: {
          type: 'boolean',
          description: '可选：是否包含工具的详细参数信息，默认true',
          default: true
        }
      },
      required: []
    }
  } as ToolDefinition,
  
  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const { server_name, include_details = true } = parameters;
      const mcpToolManager = MCPToolManager.getInstance();
      
      // 获取所有第三方工具
      const allTools = mcpToolManager.getAllThirdPartyTools();
      
      let filteredTools = allTools;
      
      // 如果指定了服务器名称，进行过滤
      if (server_name) {
        filteredTools = allTools.filter(tool => tool.server_name === server_name);
      }
      
      // 如果不包含详细信息，简化返回格式
      if (!include_details) {
        const simplifiedTools = filteredTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          server_name: tool.server_name
        }));
        
        return {
          success: true,
          result: {
            tools: simplifiedTools,
            total: simplifiedTools.length,
            servers: Array.from(new Set(simplifiedTools.map(t => t.server_name))),
            timestamp: new Date().toISOString()
          }
        };
      }
      
      // 包含详细信息
      return {
        success: true,
        result: {
          tools: filteredTools,
          total: filteredTools.length,
          servers: Array.from(new Set(filteredTools.map(t => t.server_name))),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取第三方工具列表失败'
      };
    }
  }
};