import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';
import { FileErrors, ParameterErrors, validateParameters } from '../../core/error-utils';

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
    },
    
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: true,      // 只读操作
      destructiveHint: false,  // 非破坏性操作
      idempotentHint: true,    // 幂等操作（相同输入总是相同输出）
      openWorldHint: false,    // 不是开放世界操作
      category: 'file',        // 文件操作类别
      version: '1.0.0',       // 工具版本
      tags: ['file', 'read', 'text', 'content'] // 工具标签
    },
    
    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '文件内容' },
        total_lines: { type: 'integer', description: '文件总行数' },
        start_line: { type: 'integer', description: '实际起始行号' },
        end_line: { type: 'integer', description: '实际结束行号' },
        encoding: { type: 'string', description: '使用的编码' }
      },
      required: ['content', 'total_lines', 'start_line', 'end_line', 'encoding']
    },
    
    // 示例用法
    examples: [
      {
        description: '读取整个文件',
        parameters: { path: 'example.txt' },
        expectedOutput: {
          content: '文件内容...',
          total_lines: 10,
          start_line: 1,
          end_line: 10,
          encoding: 'utf-8'
        }
      },
      {
        description: '读取文件的部分行',
        parameters: { path: 'example.txt', start_line: 5, end_line: 8 },
        expectedOutput: {
          content: '第5-8行内容...',
          total_lines: 10,
          start_line: 5,
          end_line: 8,
          encoding: 'utf-8'
        }
      },
      {
        description: '从末尾开始读取',
        parameters: { path: 'example.txt', start_line: -5 },
        expectedOutput: {
          content: '最后5行内容...',
          total_lines: 10,
          start_line: 6,
          end_line: 10,
          encoding: 'utf-8'
        }
      }
    ],
    
    // 使用指南
    guidelines: [
      '文件大小受配置中的maxFileSize限制',
      '只支持文本文件，二进制文件需要使用其他工具',
      '行号从1开始，负数表示从末尾开始计算',
      '如果未指定end_line，则读取到文件末尾'
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    // 参数验证
    validateParameters(parameters, ['path'], {
      start_line: (value) => value === undefined || Number.isInteger(value),
      end_line: (value) => value === undefined || Number.isInteger(value),
      encoding: (value) => typeof value === 'string'
    });

    const filePath = parameters.path;
    const startLine = parameters.start_line;
    const endLine = parameters.end_line;
    const encoding = parameters.encoding || 'utf-8';

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    
    // 检查文件是否为文本文件
    if (!configManager.isTextFile(resolvedPath)) {
      throw FileErrors.invalidType(filePath, configManager.getConfig().allowedExtensions);
    }

    // 检查文件大小
    const stats = await fs.stat(resolvedPath);
    const config = configManager.getConfig();
    if (stats.size > config.maxFileSize) {
      throw FileErrors.tooLarge(filePath, stats.size, config.maxFileSize);
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
      throw ParameterErrors.invalid('start_line', '起始行号不能大于结束行号');
    }

    // 提取指定行的内容
    const selectedLines = lines.slice(clampedStart - 1, clampedEnd);
    const resultContent = selectedLines.join('\n');

    // 返回结构化数据
    return {
      content: resultContent,
      total_lines: totalLines,
      start_line: clampedStart,
      end_line: clampedEnd,
      encoding: encoding
    };
  }
};