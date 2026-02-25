// 浏览器工具
import { openBrowserTool, getPageContentTool, interactWithPageTool, closeBrowserTool, browserConfigTool } from './browser';

import { ToolRegistry } from '../core/tool-registry';

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
import { createTerminalTool, terminalInputTool, readTerminalOutputTool, closeTerminalTool, listTerminalsTool } from './system/terminal';
// 重启工具
import { restartServiceTool } from './system/restart-service';

// 文档工具
import { getToolsDocumentationTool } from './system/get-tools-documentation';

// 网络工具
import { httpRequestTool } from './network/http-request';

export function registerAllTools(): void {
  const toolRegistry = ToolRegistry.getInstance();

  // 文件工具
  toolRegistry.registerTool('get_tools_documentation', getToolsDocumentationTool);
  toolRegistry.registerTool('read_file', readFileTool);
  toolRegistry.registerTool('write_file', writeFileTool);
  toolRegistry.registerTool('list_directory', listDirectoryTool);
  toolRegistry.registerTool('update_file', updateFileTool);
  // 浏览器工具
  toolRegistry.registerTool('open_browser', openBrowserTool);
  toolRegistry.registerTool('get_page_content', getPageContentTool);
  toolRegistry.registerTool('interact_with_page', interactWithPageTool);
  toolRegistry.registerTool('close_browser', closeBrowserTool);
  toolRegistry.registerTool('manage_browser_config', browserConfigTool);


  toolRegistry.registerTool('delete_files', deleteFilesTool);
  toolRegistry.registerTool('copy_file', copyFileTool);

  // 系统工具
  toolRegistry.registerTool('execute_command', executeCommandTool);
  toolRegistry.registerTool('create_terminal', createTerminalTool);
  toolRegistry.registerTool('terminal_input', terminalInputTool);
  toolRegistry.registerTool('read_terminal_output', readTerminalOutputTool);
  toolRegistry.registerTool('close_terminal', closeTerminalTool);
  toolRegistry.registerTool('list_terminals', listTerminalsTool);
  toolRegistry.registerTool('restart_service', restartServiceTool);

  // 网络工具
  toolRegistry.registerTool('http_request', httpRequestTool);
}

// 导出所有基础工具定义
export const allTools = {
  // 文件工具
  read_file: readFileTool,
  write_file: writeFileTool,
  list_directory: listDirectoryTool,
  read_code: readCodeTool,
  move_file: moveFileTool,
  update_file: updateFileTool,
  delete_files: deleteFilesTool,

  copy_file: copyFileTool,
  
  // 文档工具
  get_tools_documentation: getToolsDocumentationTool,
  
  // 系统工具
  // 浏览器工具
  open_browser: openBrowserTool,
  get_page_content: getPageContentTool,
  interact_with_page: interactWithPageTool,
  close_browser: closeBrowserTool,
  manage_browser_config: browserConfigTool,
  
  terminal_input: terminalInputTool,
  read_terminal_output: readTerminalOutputTool,
  close_terminal: closeTerminalTool,
  list_terminals: listTerminalsTool,
  execute_command: executeCommandTool,
  create_terminal: createTerminalTool,
  restart_service: restartServiceTool,
  
  // 网络工具
  http_request: httpRequestTool,
};