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
export interface MCPConnectionInfo {
  name: string;
  client: any; // MCP Client instance
  transport: any; // MCP Transport instance
  is_connected: boolean;
  last_heartbeat?: Date;
  error_count: number;
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPDiscoveryOptions {
  scanNpmGlobal?: boolean;
  scanPipGlobal?: boolean;
  scanCommonPaths?: boolean;
  scanWorkspace?: boolean;
}

export interface DiscoveredServer {
  name: string;
  path: string;
  type: 'executable' | 'npm' | 'pip' | 'uv';
  command: string[];
  description?: string;
}

export interface MCPHealthStatus {
  server_name: string;
  is_healthy: boolean;
  last_check: Date;
  error?: string;
  tools_count: number;
  uptime?: number;
}

export interface MCPTransportConfig {
  type: MCPTransportType;
  command?: string[];
  url?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  retry_count?: number;
  retry_delay?: number;
}

export interface MCPConnectionStatus {
  server_name: string;
  is_connected: boolean;
  is_running: boolean;
  transport_type: MCPTransportType;
  last_activity?: Date;
  error?: string;
  pid?: number;
}
