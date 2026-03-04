/**
 * node-pty 相关类型定义
 */

import type { IPty } from 'node-pty';

/**
 * 终端会话接口（使用 node-pty）
 */
export interface PTYTerminalSession {
  id: string;
  process: IPty;
  workdir: string;
  shell: string;
  createdAt: number;
  lastActivity: number;
  description?: string;
  lastReadPosition: number;
  outputBuffer: string[];
  isReading: boolean;
  cols?: number;
  rows?: number;
  encoding?: string;
  rawOutputBuffer?: string; // 原始输出缓冲区，用于存储控制字符
}

/**
 * 终端创建选项（扩展支持 pty）
 */
export interface PTYTerminalCreateOptions {
  shell?: string;
  workdir?: string;
  env?: Record<string, string>;
  description?: string;
  initialCommand?: string;
  cols?: number;
  rows?: number;
  encoding?: string;
  usePty?: boolean;
}

/**
 * 终端配置
 */
export interface TerminalConfig {
  usePty: boolean;
  defaultCols: number;
  defaultRows: number;
  encoding: string;
  terminalType: string;
  maxBufferSize: number;
}

/**
 * 终端尺寸
 */
export interface TerminalSize {
  cols: number;
  rows: number;
}

/**
 * 终端信号
 */
export enum TerminalSignal {
  SIGINT = '\x03', // Ctrl+C
  SIGTSTP = '\x1A', // Ctrl+Z
  SIGQUIT = '\x1C', // Ctrl+\
  SIGKILL = '\x1B', // Esc (自定义)
}

/**
 * 终端事件类型
 */
export enum TerminalEventType {
  DATA = 'data',
  EXIT = 'exit',
  ERROR = 'error',
  RESIZE = 'resize',
}