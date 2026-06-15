/**
 * Browser MCP Server - 独立的浏览器自动化 MCP 服务
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// 浏览器工具导入
import { navigateToPageTool } from './tools/browser/open-browser';
import { getPageContentTool } from './tools/browser/browser-get-page-content';
import { getPageContentV2Tool } from './tools/browser/browser-get-page-content-v2';
import { interactWithPageTool } from './tools/browser/browser-interact-with-page';
import { interactWithPageV2Tool } from './tools/browser/browser-interact-with-page-v2';
import { closeBrowserTool } from './tools/browser/close-browser';
import { browserConfigTool } from './tools/browser/browser-config-tool';

// 工具列表
const browserTools = [
  navigateToPageTool,
  getPageContentTool,
  getPageContentV2Tool,
  interactWithPageTool,
  interactWithPageV2Tool,
  closeBrowserTool,
  browserConfigTool,
];

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
 * 创建 Browser MCP Server
 */
export function createBrowserMCPServer(): Server {
  // 创建 MCP Server
  const server = new Server(
    {
      name: 'aias-browser',
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
    return {
      tools: browserTools.map((tool) => toMCPTool(tool.definition)),
    };
  });

  // 注册 CallTool 处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // 查找工具
    const tool = browserTools.find((t) => t.definition.name === name);
    if (!tool) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `工具 ${name} 不存在`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.execute(args || {});

      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
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
 * 启动 Browser MCP Server（Stdio 模式）
 */
export async function startBrowserMCPServer(): Promise<void> {
  const server = createBrowserMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// 导出工具列表（用于调试）
export function getBrowserTools() {
  return browserTools.map((t) => t.definition.name);
}