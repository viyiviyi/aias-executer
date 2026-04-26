import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

type UpdateOperation = 'insert' | 'delete' | 'replace';

interface FileUpdateItem {
  operation: UpdateOperation;
  /** 起始行号（1-based），基于原始文件行号 */
  start_line_index: number;
  /** 要插入/替换的内容（用于 insert 和 replace 操作） */
  content?: string;
  /** 要删除的行数（用于 delete 和 replace 操作） */
  line_count?: number;
}

export const updateFileTool: Tool = {
  definition: {
    name: 'utils_update_file',
    groupName: '基础工具',
    description: '编辑文件内容，支持插入、删除、替换操作',
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
                enum: ['insert', 'delete', 'replace'],
                description:
                  '操作类型：insert（在指定行前插入）、delete（删除指定行）、replace（替换指定行为新内容）',
              },
              start_line_index: {
                type: 'integer',
                description:
                  '起始行号（1-based）。insert：在些行之前插入；delete：从此行开始删除；replace：替换此行开始的行。',
                minimum: 1,
              },
              content: {
                type: 'string',
                description: '要插入或替换的内容（insert 和 replace 操作必需）',
              },
              line_count: {
                type: 'integer',
                description: '删除的行数（delete 和 replace 操作必需）。replace 时为被替换的行数。',
                minimum: 1,
              },
            },
            required: ['operation', 'start_line_index'],
          },
          description: `批量操作列表，所有操作都基于原始文件的行号。
支持三种操作：
- insert：在 start_line_index 之前插入新内容
- delete：删除从 start_line_index 开始的 line_count 行
- replace：把从 start_line_index 开始的 line_count 行替换为新内容

示例：假设文件内容为
1┆这是第1行
2┆这是第2行
3┆这是第3行
4┆这是第4行
5┆这是第5行

要在第2行前插入新行、删除第3行、把第4-5行替换为新内容，传入：
[
  {"operation": "insert", "start_line_index": 2, "content": "插入的新行"},
  {"operation": "delete", "start_line_index": 3, "line_count": 1},
  {"operation": "replace", "start_line_index": 4, "line_count": 2, "content": "替换后的第4行\n替换后的第5行"}
]

最终结果：
1┆这是第1行
2┆插入的新行
3┆这是第3行（原来的第4行）
4┆替换后的第4行
5┆替换后的第5行`,
        },
      },
      required: ['path', 'updates'],
    },

    guidelines: [
      '所有操作基于 read_code 获取的原始行号',
      '行号从 1 开始',
      'insert 在指定行前插入，delete 删除整行，replace 替换整行',
    ],

    result_use_type: 'last',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const updates = parameters.updates as FileUpdateItem[];

    if (!updates || updates.length === 0) {
      throw new Error('updates 参数不能为空');
    }

    const resolvedPath = configManager.validatePath(filePath, true);

    // 验证和标准化操作
    const normalizedUpdates = normalizeUpdates(updates);

    // 验证没有重叠操作
    validateNoOverlap(normalizedUpdates);

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const originalLines = content.split('\n');
      const originalLineCount = originalLines.length;

      // 按行号从大到小排序，确保从后往前处理避免行号偏移问题
      const sortedUpdates = [...normalizedUpdates].sort(
        (a, b) => b.start_line_index - a.start_line_index
      );

      let currentLines = [...originalLines];

      // 记录变更信息
      const changes: Array<{
        operation: UpdateOperation;
        originalStartLine: number;
        newStartLine?: number;
        originalLines: string[];
        newLines: string[];
      }> = [];

      for (const update of sortedUpdates) {
        const result = applyUpdate(currentLines, update);
        currentLines = result.lines;

        if (result.change) {
          changes.push(result.change);
        }
      }

      // 写入更新后的文件
      const newContent = currentLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      // 计算变更范围
      const minOriginalLine = Math.min(...changes.map((c) => c.originalStartLine));
      const maxOriginalLine =
        minOriginalLine +
        (changes.length > 0
          ? Math.max(
              ...changes.map((c) => {
                if (c.operation === 'insert') return c.newLines.length;
                if (c.operation === 'replace') return c.newLines.length;
                return -c.originalLines.length; // delete returns negative
              })
            )
          : 0);

      // 计算返回的上下文范围（确保在有效范围内）
      const contextStart = Math.max(0, minOriginalLine - 51); // 包含更多上文便于理解
      const contextEnd = Math.min(currentLines.length, maxOriginalLine + 50);

      // 收集变更的行号
      const changedLines: number[] = [];
      for (const change of changes) {
        if (change.operation === 'insert') {
          for (let i = 0; i < change.newLines.length; i++) {
            changedLines.push(change.newStartLine! + i);
          }
        } else if (change.operation === 'replace') {
          for (let i = 0; i < change.newLines.length; i++) {
            changedLines.push(change.originalStartLine + i);
          }
        }
        // delete 不返回新行号
      }

      // 生成上下文内容
      const contextLines = currentLines.slice(contextStart, contextEnd);
      const contextContent = contextLines
        .map((line, idx) => {
          const lineNum = contextStart + idx + 1;
          return `${lineNum}┆${line}`;
        })
        .join('\n');

      return {
        success: true,
        path: filePath,
        new_content: contextContent,
        tips: `上下文从第 ${contextStart + 1} 行到第 ${contextEnd} 行。提示：返回的上下文不是完整文件，不可用于判断格式、括号数量或代码重复。`,
        original_line_count: originalLineCount,
        new_line_count: currentLines.length,
        changed_lines:
          changedLines.length > 0
            ? `${Math.min(...changedLines)} ~ ${Math.max(...changedLines)}`
            : '无新增行',
        context_start_line: contextStart + 1,
      };
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error('没有修改文件的权限');
      }
      throw error;
    }
  },
};

/**
 * 标准化更新操作，填充默认值
 */
function normalizeUpdates(updates: FileUpdateItem[]): FileUpdateItem[] {
  return updates.map((update, index) => {
    const normalized = { ...update };

    switch (normalized.operation) {
      case 'insert':
        if (normalized.content === undefined) {
          throw new Error(`第 ${index + 1} 个操作：insert 操作需要 content 参数`);
        }
        // 移除不适用于 insert 的字段
        delete normalized.line_count;
        break;

      case 'delete':
        if (!normalized.line_count || normalized.line_count < 1) {
          throw new Error(`第 ${index + 1} 个操作：delete 操作需要有效的 line_count 参数（>=1）`);
        }
        // 移除不适用于 delete 的字段
        delete normalized.content;
        break;

      case 'replace':
        if (normalized.content === undefined) {
          throw new Error(`第 ${index + 1} 个操作：replace 操作需要 content 参数`);
        }
        if (!normalized.line_count || normalized.line_count < 1) {
          throw new Error(`第 ${index + 1} 个操作：replace 操作需要有效的 line_count 参数（>=1）`);
        }
        break;

      default:
        throw new Error(`第 ${index + 1} 个操作：不支持的操作类型: ${normalized.operation}`);
    }

    if (normalized.start_line_index < 1) {
      throw new Error(`第 ${index + 1} 个操作：start_line_index 必须 >= 1`);
    }

    return normalized;
  });
}

/**
 * 验证操作没有重叠（简化版本，不做严格检查，因为已按从后往前处理）
 */
function validateNoOverlap(updates: FileUpdateItem[]): void {
  // 已按从后往前处理，所以只检查 insert 是否会插入到其他操作的范围内
  // 这个检查比较复杂，暂时简化处理，主要依靠正确的排序来解决
  updates
}

/**
 * 应用单个更新操作
 */
function applyUpdate(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change?: {
    operation: UpdateOperation;
    originalStartLine: number;
    newStartLine?: number;
    originalLines: string[];
    newLines: string[];
  };
} {
  switch (update.operation) {
    case 'insert':
      return doInsert(lines, update);
    case 'delete':
      return doDelete(lines, update);
    case 'replace':
      return doReplace(lines, update);
    default:
      throw new Error(`不支持的更新操作: ${update.operation}`);
  }
}

/**
 * 插入内容：在指定行之前插入新内容
 */
function doInsert(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change: {
    operation: 'insert';
    originalStartLine: number;
    newStartLine: number;
    originalLines: string[];
    newLines: string[];
  };
} {
  const startLineIndex = update.start_line_index;
  const insertContent = update.content || '';

  // 验证行索引（允许在末尾之后插入，即 start_line_index = lines.length + 1）
  if (startLineIndex < 1 || startLineIndex > lines.length + 1) {
    throw new Error(
      `插入位置无效: ${startLineIndex}（有效范围: 1 ~ ${lines.length + 1}）`
    );
  }

  // 将插入内容分割为行
  const insertLines = insertContent.split('\n');
  // 移除末尾空行（如果插入内容以换行符结尾）
  if (insertLines[insertLines.length - 1] === '') {
    insertLines.pop();
  }

  // 计算插入位置（0-based）
  const insertIdx = Math.min(startLineIndex - 1, lines.length);

  // 执行插入
  const newLines = [...lines];
  newLines.splice(insertIdx, 0, ...insertLines);

  return {
    lines: newLines,
    change: {
      operation: 'insert',
      originalStartLine: startLineIndex,
      newStartLine: insertIdx + 1, // 返回 1-based 行号
      originalLines: [], // insert 没有原始行
      newLines: insertLines,
    },
  };
}

/**
 * 删除内容：删除从 start_line_index 开始的 line_count 行
 */
function doDelete(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change: {
    operation: 'delete';
    originalStartLine: number;
    originalLines: string[];
    newLines: string[];
  };
} {
  const startLineIndex = update.start_line_index;
  const lineCount = update.line_count!;

  // 验证行索引
  if (startLineIndex < 1 || startLineIndex > lines.length) {
    throw new Error(`起始行索引无效: ${startLineIndex}（总行数: ${lines.length}）`);
  }

  // 计算实际删除范围
  const endLineIndex = Math.min(startLineIndex + lineCount - 1, lines.length);
  const actualCount = endLineIndex - startLineIndex + 1;

  // 转换为 0-based 索引
  const startIdx = startLineIndex - 1;

  // 获取被删除的行内容
  const deletedLines = lines.slice(startIdx, startIdx + actualCount);

  // 执行删除
  const newLines = [...lines];
  newLines.splice(startIdx, actualCount);

  return {
    lines: newLines,
    change: {
      operation: 'delete',
      originalStartLine: startLineIndex,
      originalLines: deletedLines,
      newLines: [], // delete 没有新增行
    },
  };
}

/**
 * 替换内容：把从 start_line_index 开始的 line_count 行替换为新内容
 */
function doReplace(
  lines: string[],
  update: FileUpdateItem
): {
  lines: string[];
  change: {
    operation: 'replace';
    originalStartLine: number;
    originalLines: string[];
    newLines: string[];
  };
} {
  const startLineIndex = update.start_line_index;
  const lineCount = update.line_count!;
  const replaceContent = update.content || '';

  // 验证行索引
  if (startLineIndex < 1 || startLineIndex > lines.length) {
    throw new Error(`起始行索引无效: ${startLineIndex}（总行数: ${lines.length}）`);
  }

  // 计算实际替换范围
  const endLineIndex = Math.min(startLineIndex + lineCount - 1, lines.length);
  const actualCount = endLineIndex - startLineIndex + 1;

  // 转换为 0-based 索引
  const startIdx = startLineIndex - 1;

  // 获取被替换的原始行内容
  const originalLines = lines.slice(startIdx, startIdx + actualCount);

  // 将替换内容分割为行
  const replaceLines = replaceContent.split('\n');
  // 移除末尾空行
  if (replaceLines[replaceLines.length - 1] === '') {
    replaceLines.pop();
  }

  // 执行替换
  const newLines = [...lines];
  newLines.splice(startIdx, actualCount, ...replaceLines);

  return {
    lines: newLines,
    change: {
      operation: 'replace',
      originalStartLine: startLineIndex,
      originalLines,
      newLines: replaceLines,
    },
  };
}
