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
    return await mcpClient.discoverServers();
  }
};

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
    const serverPath = parameters.server_path;
    const serverType = parameters.server_type || 'executable';

    return await mcpClient.scanServer(serverPath, serverType);
  }
};

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
    const name = parameters.name;
    const description = parameters.description || '';
    const command = parameters.command;
    const url = parameters.url;
    const args = parameters.args;
    const env = parameters.env;
    const tools = parameters.tools;

    return await mcpClient.addServer(name, description, command, url, args, env, tools);
  }
};

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
    const toolName = parameters.tool_name;
    const arguments_ = parameters.arguments;

    return await mcpClient.callTool(toolName, arguments_);
  }
};

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
    const tools = mcpClient.listTools();
    return {
      tools,
      count: tools.length
    };
  }
};

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
    const servers = mcpClient.listServers();
    return {
      servers,
      count: servers.length
    };
  }
};

export const mcpStartServerTool: Tool = {
  definition: {
    name: 'mcp_start_server',
    description: '启动MCP服务器',
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
    const serverName = parameters.server_name;
    return await mcpClient.startServer(serverName);
  }
};

export const mcpStopServerTool: Tool = {
  definition: {
    name: 'mcp_stop_server',
    description: '停止MCP服务器',
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
    const serverName = parameters.server_name;
    return await mcpClient.stopServer(serverName);
  }
};

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
    const serverName = parameters.server_name;
    return await mcpClient.removeServer(serverName);
  }
};