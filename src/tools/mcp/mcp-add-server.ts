import { MCPClient } from '../../core/mcp-client';
import { Tool } from '../../core/tool-registry';

const mcpClient = MCPClient.getInstance();

export const mcpAddServerTool: Tool = {
  definition: {
    name: 'mcp_add_server',
    description: '添加MCP服务器',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '服务器名称'
        },
        description: {
          type: 'string',
          description: '服务器描述',
          default: ''
        },
        transport: {
          type: 'string',
          description: '传输类型 (stdio, http)',
          default: 'stdio',
          enum: ['stdio', 'http']
        },
        command: {
          type: 'array',
          items: { type: 'string' },
          description: '启动命令（用于STDIO传输）'
        },
        url: {
          type: 'string',
          description: '服务器URL（用于HTTP传输）'
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: '命令行参数'
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '环境变量'
        },
        tools: {
          type: 'array',
          items: { type: 'object' },
          description: '工具列表'
        }
      },
      required: ['name']
    }
  },


  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const name = parameters.name;
      const description = parameters.description || '';
      const command = parameters.command;
      const url = parameters.url;
      const args = parameters.args;
      const env = parameters.env;
      const tools = parameters.tools;
      
      const result = await mcpClient.addServer(
        name,
        description,
        command,
        url,
        args,
        env,
        tools
      );
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '添加MCP服务器失败'
      };
    }
  }
};