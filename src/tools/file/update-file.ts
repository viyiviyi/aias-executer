import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

interface FileUpdateItem {
  operation: 'insert' | 'delete';
  start_line_index: number; // 起始行索引（1-based）
  insert_content?: string; // 要插入的内容（用于insert操作）
  del_line_count?: number; // 要删除的行数（用于delete操作）
}

// interface LineMapping {
//   originalLine: number; // 原始行号
//   newLine: number; // 新行号
//   operation: 'insert' | 'delete' | 'unchanged';
//   content: string;
// }

export const updateFileTool: Tool = {
  definition: {
    name: 'utils_update_file',
    groupName: '基础工具',
    description: '部分更新文件内容，建议单次调用传入多个操作一次性完成文件的所有修改。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径',
        },
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['insert', 'delete'],
                description: '操作类型：insert（插入内容）或 delete（删除行）',
              },
              start_line_index: {
                type: 'integer',
                description:
                  '起始行号（1-based）。对于insert：在此行之前插入；对于delete：从此行开始删除（包括此行）。所有操作都基于原行号，使用大于所有行号的值在最后添加行。',
                minimum: 1,
              },
              insert_content: {
                type: 'string',
                description: '要插入的内容字符串（用于insert操作）',
              },
              del_line_count: {
                type: 'integer',
                description: '要删除的行数（用于delete操作）',
                minimum: 1,
              },
            },
            required: ['operation', 'start_line_index'],
          },
          description:
            '更新操作列表，所有操作都基于原行号（1-based）。如果要替换内容，先使用delete操作删除旧内容，再使用insert操作插入新内容。',
        },
      },
      required: ['path', 'updates'],
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false, // 非只读操作（更新文件）
      destructiveHint: true, // 破坏性操作（修改文件内容）
      idempotentHint: false, // 非幂等操作（多次更新可能产生不同结果）
      openWorldHint: false, // 不是开放世界操作
      category: 'file', // 文件操作类别
      version: '1.0.0', // 工具版本
      tags: ['file', 'update', 'modify', 'edit', 'patch'], // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        path: { type: 'string', description: '文件路径' },
        new_content: {
          type: 'string',
          description: '修改后的文件内容片段（包含变更范围及前后各5行上下文）',
        },
        changed_lines: {
          type: 'array',
          description: '发生变化的行号列表（基于新文件内容的行号）',
          items: { type: 'integer' },
        },
        context_start_line: {
          type: 'integer',
          description: '返回内容片段的起始行号（基于新文件内容）',
        },
      },
      required: ['success', 'path', 'new_content', 'changed_lines', 'context_start_line'],
    },
    // 使用指南
    guidelines: [
      '支持批量操作，按原始行号处理',
      '行号从1开始，基于原始文件行号',
      '如果要替换内容，先删除再插入',
      '通过read_code读取行号后再基于读取到的行号更新文件',
    ],

    result_use_type: 'last',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const updates = parameters.updates as FileUpdateItem[];
    // const contextLines = parameters.context_lines || 3;

    if (!updates || updates.length === 0) {
      throw new Error('updates参数不能为空');
    }

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);

    // 验证更新操作
    validateUpdates(updates);

    try {
      // 读取原始文件
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const originalLines = content.split('\n');

      // 按原始行号排序（从后往前处理）
      // 按原始行号排序（从后往前处理），行号相同时删除优先
      const sortedUpdates = [...updates].sort((a, b) => {
        // 首先按行号降序排序
        if (b.start_line_index !== a.start_line_index) {
          return b.start_line_index - a.start_line_index;
        }

        // 行号相同时，删除操作优先于插入操作
        if (a.operation === 'delete' && b.operation === 'insert') {
          return -1; // a(delete)在b(insert)之前
        }
        if (a.operation === 'insert' && b.operation === 'delete') {
          return 1; // b(delete)在a(insert)之前
        }

        // 操作类型相同，保持原始顺序
        return 0;
      });

      // 跟踪变更
      const changes: Array<{
        type: 'insert' | 'delete';
        originalLine: number;
        newStartLine?: number; // 在新文件中的起始行号（对于insert有意义）
        lines: string[];
      }> = [];

      let currentLines = [...originalLines];
      let minChangeLine = 99999;
      let maxChangeLine = 0;
      let pushCount = 0;
      // 应用所有更新
      for (const update of sortedUpdates) {
        if (update.start_line_index < minChangeLine) minChangeLine = update.start_line_index;
        if (maxChangeLine < update.start_line_index) maxChangeLine = update.start_line_index;
        const result = applyUpdate(currentLines, update);
        if (update.operation == 'delete') {
          pushCount = Math.max(0, pushCount - (result.change?.lines?.length || 0));
        }
        if (update.operation == 'insert') {
          pushCount += result.change?.lines?.length || 0;
        }
        currentLines = result.lines;
        if (result.change) {
          changes.push(result.change);
        }
      }

      // 写入更新后的文件
      const newContent = currentLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      // 返回包含上下文的结果
      const startChangeLine = Math.max(0, minChangeLine - 1);
      const endChangeLine = Math.min(currentLines.length, maxChangeLine + pushCount - 1);

      // 计算上下文范围（前后各5行）
      const startContext = Math.max(0, startChangeLine - 5);
      const endContext = Math.min(currentLines.length, endChangeLine + 5);
      const contextStartLine = startContext + 1; // 1-based行号

      // 收集发生变化的行号（基于新文件内容的1-based行号）
      const changedLines: number[] = [];
      for (const change of changes) {
        if (change.type === 'insert' && change.newStartLine) {
          // 添加插入的所有行号
          for (let i = 0; i < change.lines.length; i++) {
            changedLines.push(change.newStartLine + i);
          }
        }
        // 对于delete操作，不添加行号（因为行已不存在）
      }

      // 去重并排序
      const uniqueChangedLines = [...new Set(changedLines)].sort((a, b) => a - b);

      // 生成上下文内容片段
      const contextLines = currentLines.slice(startContext, endContext);
      const contextContent = contextLines
        .map((line, index) => {
          const lineNumber = startContext + index + 1; // 1-based行号
          const linePrefix = `${lineNumber}┆`;
          return linePrefix + line;
        })
        .join('\n');

      return {
        success: true,
        path: filePath,
        new_content: contextContent,
        tips: '返回的内容是修改范围内和附近的代码，非完整代码不要用于判断代码是否重复或格式不正确。',
        changed_lines: uniqueChangedLines[0] + ' ~ ' + uniqueChangedLines[uniqueChangedLines.length - 1],
        context_start_line: contextStartLine,
      };
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error('没有修改文件的权限');
      }
      throw error;
    }
  },
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

// 应用单个更新操作
function applyUpdate(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
    newStartLine?: number; // 在新文件中的起始行号（对于insert有意义）
    lines: string[];
  };
} {
  if (update.operation === 'insert') {
    return insertContent(lines, update);
  } else if (update.operation === 'delete') {
    return deleteLines(lines, update);
  }
  throw new Error(`不支持的更新操作: ${update.operation}`);
}

// 插入内容
function insertContent(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
    newStartLine?: number; // 在新文件中的起始行号（1-based）
    lines: string[];
  };
} {
  const startLineIndex = update.start_line_index;
  const insertContent = update.insert_content || '';

  // 验证行索引
  if (startLineIndex < 1) {
    throw new Error(`插入位置无效: ${startLineIndex}（必须大于等于1）`);
  }

  // 如果插入位置超过总行数+1，允许在文件末尾插入
  const insertIdx = Math.min(startLineIndex - 1, lines.length);

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
    change: {
      type: 'insert',
      originalLine: startLineIndex,
      newStartLine: insertIdx + 1, // 在新文件中的起始行号（1-based）
      lines: insertLines,
    },
  };
}

// 删除行
function deleteLines(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
    newStartLine?: number; // 在新文件中的起始行号（对于delete通常为undefined）
    lines: string[];
  };
} {
  const startLineIndex = update.start_line_index;
  const delLineCount = update.del_line_count!;

  // 验证行索引
  if (startLineIndex < 1 || startLineIndex > lines.length) {
    throw new Error(`起始行索引无效: ${startLineIndex}（总行数: ${lines.length}）`);
  }

  // 计算实际删除范围
  const endLineIndex = Math.min(startLineIndex + delLineCount - 1, lines.length);
  const actualCount = endLineIndex - startLineIndex + 1;

  // 转换为0-based索引
  const startIdx = startLineIndex - 1;

  // 获取被删除的行内容
  const deletedLines = lines.slice(startIdx, startIdx + actualCount);

  // 执行删除
  const newLines = [...lines];
  newLines.splice(startIdx, actualCount);

  return {
    lines: newLines,
    change: {
      type: 'delete',
      originalLine: startLineIndex,
      lines: deletedLines,
    },
  };
}
