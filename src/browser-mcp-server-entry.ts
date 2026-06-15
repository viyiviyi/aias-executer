/**
 * Browser MCP Server Entry Point
 *
 * 使用方式:
 *   node dist/browser-mcp-server-entry.js
 *
 * 这是一个独立的浏览器自动化 MCP 服务，可以通过以下方式在 Claude Code 中使用：
 *
 * 在 mcp.json 中配置:
 * {
 *   "mcpServers": {
 *     "browser": {
 *       "command": "node",
 *       "args": ["dist/browser-mcp-server-entry.js"],
 *       "cwd": "C:/aias-executer"
 *     }
 *   }
 * }
 */

// 注册浏览器工具（初始化 BrowserManager）
import { registerBrowserTools } from './browser-tools';

// 启动 MCP Server
import { startBrowserMCPServer } from './browser-mcp-server';

async function main() {
  console.log('🤖 AIAS Browser MCP Server 启动中...');

  // 注册浏览器工具
  console.log('📋 注册浏览器工具...');
  registerBrowserTools();

  // 启动 MCP Server
  console.log('🚀 启动 Browser MCP Server (Stdio 模式)...');
  await startBrowserMCPServer();
}

main().catch((error) => {
  console.error('❌ Browser MCP Server 启动失败:', error);
  process.exit(1);
});