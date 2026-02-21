import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const readFileTool: Tool = {
  definition: {
    name: 'read_file',
    description: '读取文本文件内容，支持指定文件后缀和读取行范围',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）'
        },
        start_line: {
          type: 'integer',
          description: '起始行号（1-based，支持负数表示从末尾开始计算，如-1表示最后一行，可选）'
        },
        end_line: {
          type: 'integer',
          description: '结束行号（1-based，支持负数表示从末尾开始计算，如-1表示最后一行，可选）'
        },
        encoding: {
          type: 'string',
          description: '文件编码（可选）',
          default: 'utf-8'
        }
      },
      required: ['path']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const filePath = parameters.path;
    const startLine = parameters.start_line;
    const endLine = parameters.end_line;
    const encoding = parameters.encoding || 'utf-8';

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    // 检查文件是否为文本文件
    if (!configManager.isTextFile(resolvedPath)) {
      throw new Error(`不支持读取此类文件: ${filePath}，该文件可能不是文本文件`);
    }


    // 检查文件大小
    const stats = await fs.stat(resolvedPath);
    const config = configManager.getConfig();
    if (stats.size > config.maxFileSize) {
      throw new Error(`文件太大 (${stats.size} bytes)，最大支持 ${config.maxFileSize} bytes`);
    }

    // 读取文件内容
    const content = await fs.readFile(resolvedPath, { encoding: encoding as BufferEncoding });
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 处理行范围（支持负数表示从末尾开始计算）
    const normalizeLineNumber = (lineNum: number, total: number): number => {
      if (lineNum < 0) {
        // 负数：从末尾开始计算，-1表示最后一行
        return Math.max(1, total + lineNum + 1);
      }
      return lineNum;
    };
    
    const start = startLine ? normalizeLineNumber(startLine, totalLines) : 1;
    const end = endLine ? normalizeLineNumber(endLine, totalLines) : totalLines;
    
    // 确保行号在有效范围内
    const clampedStart = Math.max(1, Math.min(start, totalLines));
    const clampedEnd = Math.max(1, Math.min(end, totalLines));
    
    if (clampedStart > clampedEnd) {
      throw new Error('起始行号不能大于结束行号');
    }
    // 提取指定行的内容
    const selectedLines = lines.slice(clampedStart - 1, clampedEnd);
    const result = selectedLines.join('\n');
    
    return {
      success: true,
      result: result,
      total_lines: totalLines,
      start_line: clampedStart,
      end_line: clampedEnd
    };
  }
};