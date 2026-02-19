// MCP工具索引文件
import { mcpDiscoverServersTool } from './mcp-discover-servers';
import { mcpScanServerTool } from './mcp-scan-server';
import { mcpAddServerTool } from './mcp-add-server';
import { mcpCallToolTool } from './mcp-call-tool';
import { mcpListToolsTool } from './mcp-list-tools';
import { mcpListServersTool } from './mcp-list-servers';
import { mcpStartServerTool } from './mcp-start-server';
import { mcpStopServerTool } from './mcp-stop-server';
import { mcpRemoveServerTool } from './mcp-remove-server';

// 导出所有MCP工具
export {
  mcpDiscoverServersTool,
  mcpScanServerTool,
  mcpAddServerTool,
  mcpCallToolTool,
  mcpListToolsTool,
  mcpListServersTool,
  mcpStartServerTool,
  mcpStopServerTool,
  mcpRemoveServerTool
};

// 导出所有MCP工具定义
export const mcpTools = {
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