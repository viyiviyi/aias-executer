import { Tool, ToolRegistry } from '../core/tool-registry';
// 浏览器工具
import {
  openBrowserTool,
  getPageContentTool,
  interactWithPageTool,
  closeBrowserTool,
  browserConfigTool,
} from './browser';

// 文件工具
import { readFileTool } from './file/read-file';
import { writeFileTool } from './file/write-file';
import { listDirectoryTool } from './file/list-directory';
import { updateFileTool } from './file/update-file';
import { readCodeTool } from './file/read-code';
import { moveFileTool } from './file/move-file';
import { deleteFilesTool } from './file/delete-files';
import { copyFileTool } from './file/copy-file';

// 系统工具
import { executeCommandTool } from './system/command';
import {
  createTerminalTool,
  terminalInputTool,
  readTerminalOutputTool,
  closeTerminalTool,
  listTerminalsTool,
} from './system/terminal';
// 重启工具
import { restartServiceTool } from './system/restart-service';

// 文档工具
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
  updateFileTool,
  moveFileTool,
  copyFileTool,
  deleteFilesTool,
  // 命令行
  executeCommandTool,
  // 终端
  createTerminalTool,
  terminalInputTool,
  readTerminalOutputTool,
  closeTerminalTool,
  listTerminalsTool,
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
