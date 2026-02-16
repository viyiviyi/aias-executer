export type MCPTransportType = 'stdio' | 'http' | 'websocket';

export interface MCPServerInfo {
  name: string;
  description: string;
  transport: MCPTransportType;
  command?: string[];
  url?: string;
  args?: string[];
  env?: Record<string, string>;
  tools?: MCPTool[];
  is_running?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  server_name: string;
}

export interface MCPConfig {
  servers: Record<string, MCPServerInfo>;
  version: string;
}

export interface MCPToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
  server_name?: string;
  tool_name?: string;
}

export interface MCPDiscoveryResult {
  servers: Array<{
    name: string;
    path: string;
    type: 'executable' | 'npm' | 'pip';
  }>;
}

export interface MCPScanResult {
  server_name: string;
  tools: MCPTool[];
  success: boolean;
  error?: string;
}