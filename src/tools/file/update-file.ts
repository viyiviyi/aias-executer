import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

interface FileUpdateItem {
  operation: 'insert' | 'delete';
  start_line_index: number;      // 起始行索引（1-based）
  insert_content?: string;       // 要插入的内容（用于insert操作）
  del_line_count?: number;       // 要删除的行数（用于delete操作）
}

export const updateFileTool: Tool = {
  definition: {
    name: 'update_file',
    description: '部分更新文件内容，支持批量操作：插入内容到指定行、删除行。',
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
                enum: ['insert', 'delete'],
                description: '操作类型：insert（插入内容）或 delete（删除行）'
              },
              start_line_index: {
                type: 'integer',
                description: '起始行索引（1-based）。对于insert：在此行之前插入；对于delete：从此行开始删除',
                minimum: 1
              },
              insert_content: {
                type: 'string',
                description: '要插入的内容字符串（用于insert操作）'
              },
              del_line_count: {
                type: 'integer',
                description: '要删除的行数（用于delete操作）',
                minimum: 1
              }
            },
            required: ['operation', 'start_line_index']
          },
          description: '更新操作列表，按顺序执行'
        }
      },
      required: ['path', 'updates']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const updates = parameters.updates as FileUpdateItem[];

    if (!updates || updates.length === 0) {
      throw new Error('updates参数不能为空');
    }

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    
    // 验证文件类型
    configManager.validateFileExtension(resolvedPath);

    // 验证更新操作
    validateUpdates(updates);

    try {
      // 读取原始文件
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const lines = content.split('\n');
      const originalLineCount = lines.length;

      // 按顺序应用更新操作
      const appliedUpdates: Array<{
        index: number;
        operation: string;
        start_line_index: number;
        success: boolean;
        details?: any;
        error?: string;
      }> = [];

      let currentLines = [...lines];
      let currentLineCount = originalLineCount;

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          const result = applyUpdate(currentLines, update, currentLineCount);
          currentLines = result.lines;
          currentLineCount = currentLines.length;

          appliedUpdates.push({
            index: i,
            operation: update.operation,
            start_line_index: update.start_line_index,
            success: true,
            details: result.details
          });
        } catch (error: any) {
          appliedUpdates.push({
            index: i,
            operation: update.operation,
            start_line_index: update.start_line_index,
            success: false,
            error: error.message
          });
          
          // 如果有错误，停止执行后续更新
          throw new Error(`第 ${i + 1} 个更新操作失败: ${error.message}`);
        }
      }

      // 写入更新后的文件
      const newContent = currentLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      // 返回简洁的结果
      return {
        path: filePath,
        updates_applied: appliedUpdates.length,
        original_lines: originalLineCount,
        new_lines: currentLineCount,
        applied_updates: appliedUpdates.filter(u => u.success).map(u => ({
          operation: u.operation,
          start_line_index: u.start_line_index,
          details: u.details
        }))
      };
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error('没有修改文件的权限');
      }
      throw error;
    }
  }
};

// 验证更新操作
function validateUpdates(updates: FileUpdateItem[]): void {
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    
    if (update.operation === 'insert') {
      if (!update.insert_content && update.insert_content !== '') {
        throw new Error(`第 ${i + 1} 个更新操作：insert操作需要insert_content参数`);
      }
      if (update.del_line_count !== undefined) {
        throw new Error(`第 ${i + 1} 个更新操作：insert操作不应包含del_line_count参数`);
      }
    } else if (update.operation === 'delete') {
      if (!update.del_line_count || update.del_line_count < 1) {
        throw new Error(`第 ${i + 1} 个更新操作：delete操作需要有效的del_line_count参数（>=1）`);
      }
      if (update.insert_content !== undefined) {
        throw new Error(`第 ${i + 1} 个更新操作：delete操作不应包含insert_content参数`);
      }
    } else {
      throw new Error(`第 ${i + 1} 个更新操作：不支持的更新操作: ${update.operation}`);
    }

    // 验证行索引
    if (update.start_line_index < 1) {
      throw new Error(`第 ${i + 1} 个更新操作：start_line_index必须大于等于1`);
    }
  }
}

// 获取更新操作的行号
function getUpdateLineNumber(update: FileUpdateItem): number {
  if (update.operation === 'delete') {
    return update.start_line_index || 1;
  } else if (update.operation === 'insert') {
    return update.start_line_index || 1;
  }
  return 1;
}

// 应用单个更新操作
function applyUpdate(lines: string[], update: FileUpdateItem, totalLines: number): { lines: string[]; details: any } {
  if (update.operation === 'insert') {
    return insertContent(lines, update, totalLines);
  } else if (update.operation === 'delete') {
    return deleteLines(lines, update, totalLines);
  }
  throw new Error(`不支持的更新操作: ${update.operation}`);
}

// 插入内容
function insertContent(lines: string[], update: FileUpdateItem, totalLines: number): { lines: string[]; details: any } {
  const startLineIndex = update.start_line_index;
  const insertContent = update.insert_content || '';

  // 验证行索引
  if (startLineIndex < 1) {
    throw new Error(`插入位置无效: ${startLineIndex}（必须大于等于1）`);
  }

  // 如果插入位置超过总行数+1，允许在文件末尾插入
  const insertIdx = Math.min(startLineIndex - 1, totalLines);

  // 将插入内容分割为行
  const insertLines = insertContent.split('\n');
  if (insertLines[insertLines.length - 1] === '') {
    insertLines.pop(); // 移除最后的空行（如果内容以换行符结尾）
  }

  // 执行插入
  const newLines = [...lines];
  newLines.splice(insertIdx, 0, ...insertLines);

  return {
    lines: newLines,
    details: {
      operation: 'insert',
      start_line_index: startLineIndex,
      inserted_lines: insertLines,
      inserted_line_count: insertLines.length,
      actual_insert_position: insertIdx + 1 // 转换为1-based
    }
  };
}

// 删除行
function deleteLines(lines: string[], update: FileUpdateItem, totalLines: number): { lines: string[]; details: any } {
  const startLineIndex = update.start_line_index;
  const delLineCount = update.del_line_count!;

  // 验证行索引
  if (startLineIndex < 1 || startLineIndex > totalLines) {
    throw new Error(`起始行索引无效: ${startLineIndex}（总行数: ${totalLines}）`);
  }

  // 计算实际删除范围
  const endLineIndex = Math.min(startLineIndex + delLineCount - 1, totalLines);
  const actualCount = endLineIndex - startLineIndex + 1;

  // 转换为0-based索引
  const startIdx = startLineIndex - 1;
  const endIdx = endLineIndex;

  // 保存被删除的内容
  const deletedContent = lines.slice(startIdx, endIdx);

  // 执行删除
  const newLines = [...lines];
  newLines.splice(startIdx, actualCount);

  return {
    lines: newLines,
    details: {
      operation: 'delete',
      start_line_index: startLineIndex,
      end_line_index: endLineIndex,
      deleted_line_count: actualCount,
      requested_delete_count: delLineCount,
      deleted_lines: deletedContent.map(line => line.replace(/\n$/, ''))
    }
  };
}

// 将辅助函数附加到工具对象
Object.assign(updateFileTool, {
  validateUpdates,
  getUpdateLineNumber,
  applyUpdate,
  insertContent,
  deleteLines
});