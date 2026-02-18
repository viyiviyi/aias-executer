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
    description: '部分更新文件内容，支持批量操作：插入内容到指定行、删除行。更新后返回变更区域的代码块（带行号）。',
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
                description: '起始行号（1-based）。对于insert：在此行之前插入；对于delete：从此行开始删除。所有操作都基于原始文件行号。',
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
          description: '更新操作列表，所有操作都基于原始文件行号，从后往前处理以避免冲突。'
        }
      },
      required: ['path', 'updates']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const updates = parameters.updates as FileUpdateItem[];
    const contextLines = parameters.context_lines || 3;

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

      // 按原始行号排序（从后往前处理）
      const sortedUpdates = [...updates].sort((a, b) => {
        // 按行号降序排序
        return b.start_line_index - a.start_line_index;
      });

      // 跟踪所有变更区域
      const changedRanges: Array<{start: number; end: number}> = [];
      let currentLines = [...lines];

      // 应用所有更新
      for (const update of sortedUpdates) {
        const result = applyUpdate(currentLines, update);
        currentLines = result.lines;
        
        // 记录变更范围
        if (result.affectedRange) {
          changedRanges.push(result.affectedRange);
        }
      }

      // 写入更新后的文件
      const newContent = currentLines.join('\n');
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      // 合并重叠的变更区域
      // 合并重叠或接近的变更区域（考虑上下文行）
      const mergedRanges = mergeRanges(changedRanges, contextLines);
      
      // 为每个变更区域生成代码块
      const codeBlocks: string[] = [];
      for (const range of mergedRanges) {
        const block = generateCodeBlock(currentLines, range.start, range.end, contextLines);
        if (block) {
          codeBlocks.push(block);
        }
      }

      // 返回简洁的结果
      return {
        success: true,
        path: filePath,
        change_blocks: codeBlocks.length > 0 ? codeBlocks : ['没有生成代码块（可能是空操作）']
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

// 应用单个更新操作
function applyUpdate(lines: string[], update: FileUpdateItem): { 
  lines: string[]; 
  affectedRange?: { start: number; end: number };
} {
  if (update.operation === 'insert') {
    return insertContent(lines, update);
  } else if (update.operation === 'delete') {
    return deleteLines(lines, update);
  }
  throw new Error(`不支持的更新操作: ${update.operation}`);
}

// 插入内容
function insertContent(lines: string[], update: FileUpdateItem): { 
  lines: string[]; 
  affectedRange?: { start: number; end: number };
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
    affectedRange: {
      start: insertIdx + 1,
      end: insertIdx + insertLines.length
    }
  };
}

// 删除行
function deleteLines(lines: string[], update: FileUpdateItem): { 
  lines: string[]; 
  affectedRange?: { start: number; end: number };
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
  // const endIdx = endLineIndex;

  // 执行删除
  const newLines = [...lines];
  newLines.splice(startIdx, actualCount);

  return {
    lines: newLines,
    affectedRange: {
      start: startLineIndex,
      end: endLineIndex
    }
  };
}

// 合并重叠或接近的范围（考虑上下文行）
function mergeRanges(ranges: Array<{start: number; end: number}>, contextLines: number = 3): Array<{start: number; end: number}> {
  if (ranges.length === 0) return [];
  
  // 按起始行排序
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{start: number; end: number}> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    // 如果当前范围与上一个范围重叠或接近（考虑上下文行），合并它们
    // 接近的定义：两个范围之间的距离小于2 * contextLines
    // 这样它们的代码块就不会重叠
    const distance = current.start - last.end;
    if (distance <= 2 * contextLines + 1) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

// 生成代码块
function generateCodeBlock(
  lines: string[], 
  changeStart: number, 
  changeEnd: number, 
  contextLines: number
): string {
  // 计算显示范围（包含上下文）
  const displayStart = Math.max(1, changeStart - contextLines);
  const displayEnd = Math.min(lines.length, changeEnd + contextLines);
  
  // 构建代码块
  let codeBlock = '';
  for (let i = displayStart; i <= displayEnd; i++) {
    const lineNumber = i;
    const lineContent = lines[i - 1] || '';
    
    codeBlock += `${lineNumber}│${lineContent}\n`;
  }
  
  // 移除最后一个换行符
  if (codeBlock.endsWith('\n')) {
    codeBlock = codeBlock.slice(0, -1);
  }
  
  return codeBlock;
}