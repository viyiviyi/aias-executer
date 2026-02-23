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

interface LineMapping {
  originalLine: number;  // 原始行号
  newLine: number;       // 新行号
  operation: 'insert' | 'delete' | 'unchanged';
  content: string;
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
                description: '起始行号（1-based）。对于insert：在此行之前插入；对于delete：从此行开始删除。所有操作都基于原始行号。',
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
          description: '更新操作列表，所有操作都基于原始行号，且为1-based。'
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
    

    // 验证更新操作
    validateUpdates(updates);

    try {
      // 读取原始文件
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const originalLines = content.split('\n');
      
      // 按原始行号排序（从后往前处理）
      const sortedUpdates = [...updates].sort((a, b) => {
        // 按行号降序排序
        return b.start_line_index - a.start_line_index;
      });

      // 跟踪变更
      const changes: Array<{
        type: 'insert' | 'delete';
        originalLine: number;
        lines: string[];
      }> = [];
      
      let currentLines = [...originalLines];
      
      // 应用所有更新
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

      // 生成行号映射
      const lineMappings = generateLineMappings(originalLines, changes);
      
      // 生成代码块
      const codeBlock = generateEnhancedCodeBlock(lineMappings, changes, contextLines);

      // 返回简洁的结果
      return {
        success: true,
        path: filePath,
        changed_code_context: codeBlock ? [codeBlock] : []
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
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
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
function insertContent(lines: string[], update: FileUpdateItem): { 
  lines: string[]; 
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
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
      lines: insertLines
    }
  };
}

// 删除行
function deleteLines(lines: string[], update: FileUpdateItem): { 
  lines: string[]; 
  change?: {
    type: 'insert' | 'delete';
    originalLine: number;
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
      lines: deletedLines
    }
  };
}

// 生成行号映射
function generateLineMappings(
  originalLines: string[],
  changes: Array<{
    type: 'insert' | 'delete';
    originalLine: number;
    lines: string[];
  }>
): LineMapping[] {
  const mappings: LineMapping[] = [];
  
  // 收集所有删除的行
  const deletedLines = new Set<number>();
  for (const change of changes) {
    if (change.type === 'delete') {
      // 对于删除操作，记录被删除的原始行号
      for (let i = 0; i < change.lines.length; i++) {
        const originalLine = change.originalLine + i;
        if (originalLine <= originalLines.length) {
          deletedLines.add(originalLine);
        }
      }
    }
  }
  
  // 收集插入操作的位置
  const insertions = new Map<number, string[]>();
  for (const change of changes) {
    if (change.type === 'insert') {
      insertions.set(change.originalLine, change.lines);
    }
  }
  
  // 生成映射
  let newLineCounter = 1;
  
  for (let originalLine = 1; originalLine <= originalLines.length; originalLine++) {
    // 检查是否有插入在这个位置之前
    const insertedLines = insertions.get(originalLine);
    if (insertedLines) {
      // 添加插入的行
      for (let i = 0; i < insertedLines.length; i++) {
        mappings.push({
          originalLine: originalLine,
          newLine: newLineCounter,
          operation: 'insert',
          content: insertedLines[i]
        });
        newLineCounter++;
      }
    }
    
    // 检查当前行是否被删除
    if (deletedLines.has(originalLine)) {
      // 被删除的行
      mappings.push({
        originalLine,
        newLine: -1,
        operation: 'delete',
        content: originalLines[originalLine - 1]
      });
    } else {
      // 未被删除的行
      mappings.push({
        originalLine,
        newLine: newLineCounter,
        operation: 'unchanged',
        content: originalLines[originalLine - 1]
      });
      newLineCounter++;
    }
  }
  
  // 处理文件末尾的插入
  for (const change of changes) {
    if (change.type === 'insert' && change.originalLine > originalLines.length) {
      for (let i = 0; i < change.lines.length; i++) {
        mappings.push({
          originalLine: change.originalLine,
          newLine: newLineCounter,
          operation: 'insert',
          content: change.lines[i]
        });
        newLineCounter++;
      }
    }
  }
  
  return mappings;
}

// 生成增强的代码块
function generateEnhancedCodeBlock(
  lineMappings: LineMapping[],
  changes: Array<{
    type: 'insert' | 'delete';
    originalLine: number;
    lines: string[];
  }>,
  contextLines: number
): string {
  if (lineMappings.length === 0) {
    return '';
  }
  
  // 找到所有变更影响的行范围
  let minOriginalLine = Infinity;
  let maxOriginalLine = -Infinity;
  
  for (const change of changes) {
    if (change.type === 'insert') {
      minOriginalLine = Math.min(minOriginalLine, change.originalLine);
      maxOriginalLine = Math.max(maxOriginalLine, change.originalLine);
    } else if (change.type === 'delete') {
      minOriginalLine = Math.min(minOriginalLine, change.originalLine);
      maxOriginalLine = Math.max(maxOriginalLine, change.originalLine + change.lines.length - 1);
    }
  }
  
  // 找到相关的行映射（包含上下文）
  const relevantMappings = lineMappings.filter(mapping => {
    return mapping.originalLine >= minOriginalLine - contextLines && 
           mapping.originalLine <= maxOriginalLine + contextLines;
  });
  
  if (relevantMappings.length === 0) {
    return '';
  }
  
  // 构建代码块
  let codeBlock = '';
  
  for (const mapping of relevantMappings) {
    let linePrefix = '';
    
    if (mapping.operation === 'insert') {
      // 插入时：原始行号 + 新行号┆行内容
      linePrefix = `${mapping.originalLine} + ${mapping.newLine}┆`;
    } else if (mapping.operation === 'delete') {
      // 删除时：-原始行号┆行内容
      linePrefix = ` - ${mapping.originalLine}┆`;
    } else {
      // 不变时：原始行号 新行号┆行内容
      linePrefix = `${mapping.originalLine} ${mapping.newLine}┆`;
    }
    
    codeBlock += `${linePrefix}${mapping.content}\n`;
  }
  
  // 移除最后一个换行符
  if (codeBlock.endsWith('\n')) {
    codeBlock = codeBlock.slice(0, -1);
  }
  
  return codeBlock;
}