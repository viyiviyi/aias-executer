export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  result_use_type?: 'once'|'last'; // once:仅在调用后加载在上下文一次；last: 直到下一个同名调用一直加载在上下文
  // MCP构建器建议的元数据字段
  metadata?: {
    readOnlyHint?: boolean;      // 是否为只读操作
    destructiveHint?: boolean;   // 是否为破坏性操作
    idempotentHint?: boolean;    // 是否为幂等操作
    openWorldHint?: boolean;     // 是否为开放世界操作
    category?: string;           // 工具分类
    version?: string;            // 工具版本
    tags?: string[];             // 工具标签
  };
  
  // 结构化输出模式（MCP构建器建议）
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  
  // 示例用法
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput?: any;
  }>;
  
  // 使用指南
  guidelines?: string[];
}

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