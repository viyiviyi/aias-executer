/**
 * MCP Server - 使用 @modelcontextprotocol/sdk 封装项目为MCP服务
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolExecutor } from './core/executor';

export interface MCPServerOptions {
  /**
   * 启用的工具列表
   * 如果为空或undefined，则启用所有工具
   * 工具名称支持前缀匹配，例如 "file_" 会启用所有以 file_ 开头的工具
   * 工具名称支持组名，例如 "基础工具" 会启用该组下的所有工具
   */
  enabledTools?: string[];
  /**
   * 禁用的工具列表
   * 优先级高于 enabledTools
   */
  disabledTools?: string[];
}

/**
 * 转换工具定义为 MCP Tool 格式
 */
function toMCPTool(definition: any): Tool {
  return {
    name: definition.name,
    description: definition.description || '',
    inputSchema: {
      type: 'object',
      properties: definition.parameters?.properties || {},
      required: definition.parameters?.required || [],
    },
  };
}

/**
 * 创建 MCP Server
 */
export function createMCPServer(options: MCPServerOptions = {}): Server {
  const { enabledTools, disabledTools = [] } = options;

  // 检查工具是否应该被启用
  const isToolEnabled = (toolName: string, groupName?: string): boolean => {
    // 检查是否在禁用列表中
    for (const disabled of disabledTools) {
      if (toolName === disabled || toolName.startsWith(disabled)) {
        return false;
      }
    }

    // 如果没有指定 enabledTools，则启用所有工具
    if (!enabledTools || enabledTools.length === 0) {
      return true;
    }

    // 检查是否在启用列表中
    for (const enabled of enabledTools) {
      // 支持精确匹配
      if (toolName === enabled) {
        return true;
      }
      // 支持前缀匹配 (例如 "file_" 匹配 "file_read")
      if (enabled.endsWith('_') && toolName.startsWith(enabled)) {
        return true;
      }
      // 支持组名匹配
      if (groupName && groupName === enabled) {
        return true;
      }
    }

    return false;
  };

  const executor = new ToolExecutor();

  // 获取所有工具定义
  const allDefinitions = executor.getToolDefinitions();

  // 过滤工具
  const filteredDefinitions = allDefinitions.filter((def) =>
    isToolEnabled(def.name, def.groupName)
  );

  // 构建工具名称集合用于快速查找
  const enabledToolNames = new Set(filteredDefinitions.map((def) => def.name));

  // 创建 MCP Server
  const server = new Server(
    {
      name: 'aias-executor',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册 ListTools 处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // 动态获取当前可用的工具（考虑运行时可能的变化）
    const currentDefinitions = executor.getToolDefinitions();
    const availableTools = currentDefinitions.filter((def) =>
      enabledToolNames.has(def.name)
    );

    return {
      tools: availableTools.map(toMCPTool),
    };
  });

  // 注册 CallTool 处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // 检查工具是否在启用列表中
    if (!enabledToolNames.has(name)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `工具 ${name} 未启用或不存在`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await executor.executeTool(name, args || {});

      if (result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: result.error || '执行工具时出错',
            },
          ],
          isError: true,
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: error.message || '执行工具时出现未知错误',
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * 启动 MCP Server（Stdio 模式）
 */
export async function startMCPServer(options: MCPServerOptions = {}): Promise<void> {
  const server = createMCPServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * 启动 MCP Server（带初始化等待）
 * 用于需要等待初始化的场景
 */
export async function startMCPServerWithInit(
  options: MCPServerOptions = {},
  initTimeout: number = 5000
): Promise<void> {
  const server = createMCPServer(options);
  const transport = new StdioServerTransport();

  // 等待一小段时间让服务器初始化
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(); // 只要没报错就认为初始化成功
    }, initTimeout);

    // 连接后清除定时器
    server.connect(transport).then(() => {
      clearTimeout(timer);
      resolve();
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// 导出工具列表获取函数
export function getAvailableTools(): string[] {
  const executor = new ToolExecutor();
  return executor.getAvailableTools();
}

// 导出所有工具定义（用于调试）
export function getAllToolDefinitions() {
  const executor = new ToolExecutor();
  return executor.getToolDefinitions();
}