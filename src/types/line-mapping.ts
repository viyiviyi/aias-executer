export interface LineMapping {
  originalLine: number;  // 原始行号
  newLine: number;       // 新行号
  operation: 'insert' | 'delete' | 'unchanged';  // 操作类型
  content: string;       // 行内容
}

export interface ChangeInfo {
  originalStart: number;  // 原始起始行号
  originalEnd: number;    // 原始结束行号
  newStart: number;       // 新起始行号
  newEnd: number;         // 新结束行号
  operation: 'insert' | 'delete';  // 操作类型
  lines: string[];        // 涉及的行内容
}