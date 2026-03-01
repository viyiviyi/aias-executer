/**
 * 工具相关类型定义
 */

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