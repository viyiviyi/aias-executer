import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpScanServerTool: Tool = {
  definition: {
    name: 'mcp_scan_server',
    description: '扫描MCP服务器以获取工具列表',
    parameters: {
      type: 'object',
      properties: {
        server_path: {
          type: 'string',
          description: '服务器路径或名称'
        },
        server_type: {
          type: 'string',
          description: '服务器类型 (executable, npm, pip)',
          default: 'executable',
          enum: ['executable', 'npm', 'pip']
        }
      },
      required: ['server_path']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const serverPath = parameters.server_path;
      const serverType = parameters.server_type || 'executable';
      
      const result = await mcpClient.scanServer(serverPath, serverType);
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '扫描MCP服务器失败'
      };
    }
  }
};