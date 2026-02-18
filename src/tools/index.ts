import { ToolRegistry } from '../core/tool-registry';

// 文件工具
import { readFileTool } from './file/read-file';
import { writeFileTool } from './file/write-file';
import { listDirectoryTool } from './file/list-directory';
import { updateFileTool } from './file/update-file';
import { readCodeTool } from './file/read-code';
import { deleteFileTool } from './file/delete-file';
import { moveFileTool } from './file/move-file';
import { deleteFilesTool } from './file/delete-files';
import { copyFileTool } from './file/copy-file';

// 系统工具
import { executeCommandTool } from './system/command';
import { createTerminalTool, terminalInputTool, readTerminalOutputTool, closeTerminalTool, listTerminalsTool } from './system/terminal';

// 文档工具
import { getToolsDocumentationTool } from './system/get-tools-documentation';
// 网络工具
import { httpRequestTool } from './network/http-request';

// MCP工具
import {
  mcpDiscoverServersTool,
  mcpScanServerTool,
  mcpAddServerTool,
  mcpCallToolTool,
  mcpListToolsTool,
  mcpListServersTool,
  mcpStartServerTool,
  mcpStopServerTool,
  mcpRemoveServerTool
} from './mcp/mcp-tools';

// 注册所有工具
export function registerAllTools(): void {
  const toolRegistry = ToolRegistry.getInstance();

  // 文件工具
  toolRegistry.registerTool('get_tools_documentation', getToolsDocumentationTool);
  toolRegistry.registerTool('read_file', readFileTool);
  toolRegistry.registerTool('write_file', writeFileTool);
  toolRegistry.registerTool('list_directory', listDirectoryTool);
  toolRegistry.registerTool('update_file', updateFileTool);
  toolRegistry.registerTool('read_code', readCodeTool);
  toolRegistry.registerTool('delete_file', deleteFileTool);
  toolRegistry.registerTool('move_file', moveFileTool);
  toolRegistry.registerTool('delete_files', deleteFilesTool);
  toolRegistry.registerTool('copy_file', copyFileTool);

  // 系统工具
  toolRegistry.registerTool('execute_command', executeCommandTool);
  toolRegistry.registerTool('create_terminal', createTerminalTool);
  toolRegistry.registerTool('terminal_input', terminalInputTool);
  toolRegistry.registerTool('read_terminal_output', readTerminalOutputTool);
  toolRegistry.registerTool('close_terminal', closeTerminalTool);
  toolRegistry.registerTool('list_terminals', listTerminalsTool);

  // 网络工具
  toolRegistry.registerTool('http_request', httpRequestTool);

  // MCP工具
  toolRegistry.registerTool('mcp_discover_servers', mcpDiscoverServersTool);
  toolRegistry.registerTool('mcp_scan_server', mcpScanServerTool);
  toolRegistry.registerTool('mcp_add_server', mcpAddServerTool);
  toolRegistry.registerTool('mcp_call_tool', mcpCallToolTool);
  toolRegistry.registerTool('mcp_list_tools', mcpListToolsTool);
  toolRegistry.registerTool('mcp_list_servers', mcpListServersTool);
  toolRegistry.registerTool('mcp_start_server', mcpStartServerTool);
  toolRegistry.registerTool('mcp_stop_server', mcpStopServerTool);
  toolRegistry.registerTool('mcp_remove_server', mcpRemoveServerTool);
}

// 导出所有工具定义
export const allTools = {
  // 文件工具
  read_file: readFileTool,
  write_file: writeFileTool,
  list_directory: listDirectoryTool,
  read_code: readCodeTool,
  update_file: updateFileTool,
  delete_file: deleteFileTool,
  move_file: moveFileTool,
  delete_files: deleteFilesTool,
  copy_file: copyFileTool,
  // 文档工具
  get_tools_documentation: getToolsDocumentationTool,
  
  // 系统工具
  terminal_input: terminalInputTool,
  read_terminal_output: readTerminalOutputTool,
  close_terminal: closeTerminalTool,
  list_terminals: listTerminalsTool,
  execute_command: executeCommandTool,
  create_terminal: createTerminalTool,
  
  // 网络工具
  http_request: httpRequestTool,
  
  // MCP工具
  mcp_discover_servers: mcpDiscoverServersTool,
  mcp_scan_server: mcpScanServerTool,
  mcp_add_server: mcpAddServerTool,
  mcp_call_tool: mcpCallToolTool,
  mcp_list_tools: mcpListToolsTool,
  mcp_list_servers: mcpListServersTool,
  mcp_start_server: mcpStartServerTool,
  mcp_stop_server: mcpStopServerTool,
  mcp_remove_server: mcpRemoveServerTool
};
