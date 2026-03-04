import { Tool } from '../types';
import { ToolRegistry } from '../core/tool-registry';
// 浏览器工具
import { browserConfigTool } from './browser/browser-config-tool';
import { closeBrowserTool } from './browser/close-browser';
import { getPageContentTool } from './browser/browser-get-page-content';
import { interactWithPageTool } from './browser/browser-interact-with-page';
import { openBrowserTool } from './browser/open-browser';
// 文件工具
import { readFileTool } from './file/read-file';
import { writeFileTool } from './file/write-file';
import { listDirectoryTool } from './file/list-directory';
import { updateFileTool } from './file/update-file';
import { readCodeTool } from './file/read-code';
import { moveFileTool } from './file/move-file';
import { deleteFilesTool } from './file/delete-files';
import { copyFileTool } from './file/copy-file';
import { createDirectoryTool } from './file/create-directory';

// 系统工具
// 系统工具
import { executeCommandTool } from './system';
import {
  createTerminalTool,
  terminalInputTool,
  readTerminalOutputTool,
  closeTerminalTool,
  listTerminalsTool,
  resizeTerminalTool,
  sendSignalTool,
  getRawOutputTool,
} from './system';
// 重启工具
import { restartServiceTool } from './system/restart-service';

// 文档工具
// 密码工具
import { getPasswordsInfoTool } from './system/get-passwords-info';
import { getToolsDocumentationTool } from './system/get-tools-documentation';

// 网络工具
import { httpRequestTool } from './network/http-request';

const toolList: Tool[] = [
  getToolsDocumentationTool,
  // 文件工具
  readFileTool,
  writeFileTool,
  readCodeTool,
  listDirectoryTool,
  createDirectoryTool,
  updateFileTool,
  moveFileTool,
  copyFileTool,
  // readCodeObjectTreeTool, // 已升级为getDocumentOutlineTool
  deleteFilesTool,
  // 命令行
  executeCommandTool,
  // 终端
  createTerminalTool,
  terminalInputTool,
  readTerminalOutputTool,
  closeTerminalTool,
  listTerminalsTool,
  resizeTerminalTool,
  sendSignalTool,
  getRawOutputTool,
  // 浏览器工具（使用 Playwright MCP）
  openBrowserTool,
  getPageContentTool,
  interactWithPageTool,
  closeBrowserTool,
  browserConfigTool,
  // 网络工具
  httpRequestTool,
  // 重启服务
  restartServiceTool,
  // 密码工具
  getPasswordsInfoTool,
];

// 导出所有基础工具定义
export const allTools: Record<string, Tool> = {};

export function registerAllTools(): void {
  const toolRegistry = ToolRegistry.getInstance();
  toolList.forEach((tool) => {
    allTools[tool.definition.name] = tool;
    toolRegistry.registerTool(tool.definition.name, tool);
  });
}