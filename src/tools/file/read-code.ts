import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

interface ReadCodeParameters {
  path: string;
  extensions?: string[];
  start_line?: number;
  end_line?: number;
  encoding?: string;
  show_line_numbers?: boolean;
  line_number_format?: string;
}

interface ReadCodeResult {
  content: string;
  total_lines: number;
  start_line: number;
  end_line: number;
}

const readCodeTool: Tool = {
  definition: {
    name: 'read_code',
    description: '读取代码文件内容，支持行号显示和行范围选择。返回的内容包括行号信息。',

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
        },
        show_line_numbers: {
          type: 'boolean',
          description: '是否在返回的content中包含行号（可选）',
          default: true
        },
        line_number_format: {
          type: 'string',
          description: '行号格式（可选），例如："{line}┆" 或 "[{line}] "',
          default: '{line}┆'
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
      tags: ['file', 'code', 'read', 'source', 'programming'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: {
          type: 'object',
          properties: {
            content: { type: 'string', description: '代码内容（可能包含行号 1-based）' },
            total_lines: { type: 'integer', description: '文件总行数' },
            start_line: { type: 'integer', description: '实际起始行号' },
            end_line: { type: 'integer', description: '实际结束行号' }
          },
          required: ['content', 'total_lines', 'start_line', 'end_line']
        }
      },
      required: ['success', 'result']
    },
    // 使用指南
    guidelines: [
      '专为读取代码文件设计，支持行号(1-based)显示',
      '可以指定行范围，支持负数表示从末尾开始',
      '可以自定义行号格式',
      '默认显示行号，可以关闭',
      '文件大小受配置限制'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const {
      path: filePath,
      start_line: startLine,
      end_line: endLine,
      encoding = 'utf-8',
      show_line_numbers: showLineNumbers = true,
      line_number_format: lineNumberFormat = '{line}┆'
    } = parameters as ReadCodeParameters;

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

    // 处理行范围
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

    // 构建带行号的内容
    let formattedContent = '';

    for (let i = 0; i < selectedLines.length; i++) {
      const lineNumber = clampedStart + i;
      const lineContent = selectedLines[i];

      if (showLineNumbers) {
        const formattedLineNumber = lineNumberFormat.replace('{line}', lineNumber.toString());
        formattedContent += formattedLineNumber + lineContent + '\n';
      } else {
        formattedContent += lineContent + '\n';
      }
    }

    // 移除最后一个多余的换行符
    if (formattedContent.endsWith('\n')) {
      formattedContent = formattedContent.slice(0, -1);
    }

    // 返回结果
    const result: ReadCodeResult = {
      content: formattedContent,
      total_lines: totalLines,
      start_line: clampedStart,
      end_line: clampedEnd
    };

    return {
      success: true,
      result: result
    };
  }
};

export { readCodeTool };