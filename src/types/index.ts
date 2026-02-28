

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface OpenAIFunctionCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

export interface ToolCallRequest {
  tool: string;
  parameters: Record<string, any>;
}

export interface BatchToolCallRequest {
  requests: Array<OpenAIFunctionCall | ToolCallRequest>;
}

export interface BatchToolCallResult {
  batch_results: Array<ToolExecutionResult & { index: number }>;
  total: number;
  successful: number;
  failed: number;
}

export interface Config {
  workspaceDir: string;
  maxFileSize: number;
  commandTimeout: number;
  maxTerminals: number;
  allowedCommands: string[];
  allowedExtensions: string[];
  pathValidation: boolean;
  port: number;
  host: string;
  configPath?: string;
  mcp?: {
    autoStartServers?: string[];
    servers?: Record<string, {
      name: string;
      description: string;
      transport: 'stdio' | 'http' | 'websocket';
      command?: string[];
      url?: string;
      args?: string[];
      env?: Record<string, string>;
      autoStart?: boolean;
    }>;
  };
  packageManager?: {
    default?: 'yarn' | 'npm';
    autoInstall?: boolean;
    installTimeout?: number;
  };
  autostart?: {
    dir?: string;
    enabled?: boolean;
    timeout?: number;
    recursive?: boolean;
  };
}

export interface TerminalInfo {
  id: string;
  process: any;
  workdir: string;
  shell: string;
  createdAt: number;
  lastActivity: number;
  description?: string;
  lastReadPosition: number; // 上次读取的位置
  outputBuffer: string[]; // 输出缓冲区
  isReading: boolean; // 是否正在读取
}