/**
 * 终端相关类型定义
 */

export interface TerminalSession {
  id: string;
  process: any;
  workdir: string;
  shell: string;
  createdAt: number;
  lastActivity: number;
  description?: string;
  lastReadPosition: number;
  outputBuffer: string[];
  isReading: boolean;
}

export interface TerminalCreateOptions {
  shell?: string;
  workdir?: string;
  env?: Record<string, string>;
  description?: string;
  initialCommand?: string;
}

export interface TerminalInputOptions {
  terminal_id: string;
  input: string;
  wait_timeout?: number;
  max_lines?: number;
}