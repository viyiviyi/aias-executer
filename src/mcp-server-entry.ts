/**
 * MCP Server Entry Point
 *
 * 使用方式:
 *   # 启用所有工具
 *   node dist/mcp-server-entry.js
 *
 *   # 只启用指定工具
 *   node dist/mcp-server-entry.js --enabled-tools file_,terminal_,browser_
 *
 *   # 启用和禁用特定工具
 *   node dist/mcp-server-entry.js --enabled-tools utils_ --disabled-tools utils_restart_service
 *
 * 参数说明:
 *   --enabled-tools: 启用的工具列表，逗号分隔，支持前缀匹配 (如 "file_" 匹配所有 file_ 开头的工具)
 *   --disabled-tools: 禁用的工具列表，逗号分隔，优先级高于 enabled-tools
 */

import { registerAllTools } from './tools';
import { startMCPServer } from './mcp-server';

// 解析命令行参数
function parseArgs(): { enabledTools?: string[]; disabledTools?: string[] } {
  const args = process.argv.slice(2);
  const result: { enabledTools?: string[]; disabledTools?: string[] } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--enabled-tools' && args[i + 1]) {
      result.enabledTools = args[i + 1].split(',').map((t) => t.trim());
      i++;
    } else if (arg === '--disabled-tools' && args[i + 1]) {
      result.disabledTools = args[i + 1].split(',').map((t) => t.trim());
      i++;
    }
  }

  return result;
}

async function main() {
  console.log('🤖 AIAS Executor MCP Server 启动中...');

  // 注册所有工具
  console.log('📋 注册工具...');
  registerAllTools();

  // 解析参数
  const { enabledTools, disabledTools } = parseArgs();

  if (enabledTools && enabledTools.length > 0) {
    console.log(`✅ 启用的工具: ${enabledTools.join(', ')}`);
  } else {
    console.log('📋 将启用所有工具');
  }

  if (disabledTools && disabledTools.length > 0) {
    console.log(`❌ 禁用的工具: ${disabledTools.join(', ')}`);
  }

  // 启动 MCP Server
  console.log('🚀 启动 MCP Server (Stdio 模式)...');
  await startMCPServer({ enabledTools, disabledTools });
}

main().catch((error) => {
  console.error('❌ MCP Server 启动失败:', error);
  process.exit(1);
});