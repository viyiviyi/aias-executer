import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

interface FileUpdate {
  operation: 'delete_lines' | 'insert_lines';
  start_line?: number;      // 用于delete_lines
  line_count?: number;      // 用于delete_lines
  line_number?: number;     // 用于insert_lines
  lines?: string[];         // 用于insert_lines
}

export const updateFileTool: Tool = {
  definition: {
    name: 'update_file',
    description: '部分更新文件内容，支持批量操作：删除行、插入行',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径'
        },
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['delete_lines', 'insert_lines'],
                description: '操作类型'
              },
              start_line: {
                type: 'integer',
                description: '起始行号（用于delete_lines）',
                minimum: 1
              },
              line_count: {
                type: 'integer',
                description: '行数（用于delete_lines）',
                minimum: 1
              },
              line_number: {
                type: 'integer',
                description: '行号（用于insert_lines）',
                minimum: 1
              },
              lines: {
                type: 'array',
                items: { type: 'string' },
                description: '要插入的行（用于insert_lines）'
              }
            },
            required: ['operation']
          },
          description: '更新操作列表'
        }
      },
      required: ['path', 'updates']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const updates = parameters.updates as FileUpdate[];

    if (!updates || updates.length === 0) {
      throw new Error('updates参数不能为空');
    }

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    
    // 验证文件类型
    configManager.validateFileExtension(resolvedPath);

    // 验证更新操作
    this.validateUpdates(updates);

    try {
      // 读取原始文件
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const lines = content.split('\n');
      const originalLineCount = lines.length;

      // 应用更新操作（从后往前，避免行号变化影响）
      const sortedUpdates = [...updates]
        .map((update, index) => ({ update, index }))
        .sort((a, b) => this.getUpdateLineNumber(b.update) - this.getUpdateLineNumber(a.update));

      const appliedUpdates: Array<{
        index: number;
        operation: string;
        success: boolean;
        details?: any;
        error?: string;
      }> = [];

      let currentLines = [...lines];
      let currentLineCount = originalLineCount;

      for (const { update, index } of sortedUpdates) {
        try {
          const result = this.applyUpdate(currentLines, update, currentLineCount);
          currentLines = result.lines;
          currentLineCount = currentLines.length;

          appliedUpdates.push({
            index,
            operation: update.operation,
            success: true,
            details: result.details
          });
        } catch (error: any) {
          appliedUpdates.push({
            index,
            operation: update.operation,
            success: false,
            error: error.message
          });
        }
      }

      // 检查是否有失败的更新
      const failedUpdates = appliedUpdates.filter(u => !u.success);
      if (failedUpdates.length > 0) {
        throw new Error(`部分更新操作失败: ${JSON.stringify(failedUpdates)}`);
      }

      // 写入更新后的文件
      const newContent = currentLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      // 返回简洁的结果
      return {
        path: filePath,
        updates_applied: appliedUpdates.length,
        original_lines: originalLineCount,
        new_lines: currentLineCount
      };
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error('没有修改文件的权限');
      }
      throw error;
    }
  },

  validateUpdates(updates: FileUpdate[]): void {
    for (const update of updates) {
      if (update.operation === 'delete_lines') {
        if (!update.start_line || update.start_line < 1) {
          throw new Error('delete_lines操作需要有效的start_line参数');
        }
        if (!update.line_count || update.line_count < 1) {
          throw new Error('delete_lines操作需要有效的line_count参数');
        }
      } else if (update.operation === 'insert_lines') {
        if (!update.line_number || update.line_number < 1) {
          throw new Error('insert_lines操作需要有效的line_number参数');
        }
        if (!update.lines || update.lines.length === 0) {
          throw new Error('insert_lines操作需要非空的lines参数');
        }
      } else {
        throw new Error(`不支持的更新操作: ${update.operation}`);
      }
    }
  },

  getUpdateLineNumber(update: FileUpdate): number {
    if (update.operation === 'delete_lines') {
      return update.start_line || 1;
    } else if (update.operation === 'insert_lines') {
      return update.line_number || 1;
    }
    return 1;
  },

  applyUpdate(lines: string[], update: FileUpdate, totalLines: number): { lines: string[]; details?: any } {
    if (update.operation === 'delete_lines') {
      return this.deleteLines(lines, update, totalLines);
    } else if (update.operation === 'insert_lines') {
      return this.insertLines(lines, update, totalLines);
    }
    throw new Error(`不支持的更新操作: ${update.operation}`);
  },

  deleteLines(lines: string[], update: FileUpdate, totalLines: number): { lines: string[]; details: any } {
    const startLine = update.start_line!;
    const lineCount = update.line_count!;

    // 验证行号
    if (startLine < 1 || startLine > totalLines) {
      throw new Error(`起始行号无效: ${startLine} (总行数: ${totalLines})`);
    }

    // 计算实际删除范围
    const endLine = Math.min(startLine + lineCount - 1, totalLines);
    const actualCount = endLine - startLine + 1;

    // 转换为0-based索引
    const startIdx = startLine - 1;
    const endIdx = endLine;

    // 保存被删除的内容
    const deletedContent = lines.slice(startIdx, endIdx);

    // 执行删除
    const newLines = [...lines];
    newLines.splice(startIdx, actualCount);

    return {
      lines: newLines,
      details: {
        start_line: startLine,
        end_line: endLine,
        line_count: actualCount,
        deleted_lines: deletedContent.map(line => line.replace(/\n$/, ''))
      }
    };
  },

  insertLines(lines: string[], update: FileUpdate, totalLines: number): { lines: string[]; details: any } {
    const lineNumber = update.line_number!;
    const newLines = update.lines!;

    // 验证行号
    if (lineNumber < 1) {
      throw new Error(`行号必须大于等于1: ${lineNumber}`);
    }

    // 如果行号超过总行数+1，抛出错误而不是填充空行
    if (lineNumber > totalLines + 1) {
      throw new Error(`行号 ${lineNumber} 超出范围，文件只有 ${totalLines} 行`);
    }

    // 转换为0-based索引
    const insertIdx = lineNumber - 1;

    // 确保每行都有换行符（在join时处理）
    const formattedLines = newLines.map(line => line);

    // 执行插入
    const newLinesArray = [...lines];
    newLinesArray.splice(insertIdx, 0, ...formattedLines);

    return {
      lines: newLinesArray,
      details: {
        line_number: lineNumber,
        inserted_lines: formattedLines,
        line_count: formattedLines.length
      }
    };
  }
};