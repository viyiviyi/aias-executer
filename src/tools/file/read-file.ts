import fs from 'fs/promises';
import path from 'path';
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
        extensions: {
          type: 'array',
          items: { type: 'string' },
          description: '允许的文件扩展名列表（可选）',
          default: ['.txt', '.md', '.py', '.js', '.ts', '.java', '.cs', '.dart', '.json']
        },
        start_line: {
          type: 'integer',
          description: '起始行号（1-based，可选）',
          minimum: 1
        },
        end_line: {
          type: 'integer',
          description: '结束行号（1-based，可选）',
          minimum: 1
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

  async execute(parameters: Record<string, any>): Promise<string> {
    const filePath = parameters.path;
    const extensions = parameters.extensions;
    const startLine = parameters.start_line;
    const endLine = parameters.end_line;
    const encoding = parameters.encoding || 'utf-8';

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    
    // 验证文件类型
    configManager.validateFileExtension(resolvedPath, extensions);

    // 检查文件大小
    const stats = await fs.stat(resolvedPath);
    const config = configManager.getConfig();
    if (stats.size > config.maxFileSize) {
      throw new Error(`文件太大 (${stats.size} bytes)，最大支持 ${config.maxFileSize} bytes`);
    }

    // 读取文件内容
    const content = await fs.readFile(resolvedPath, encoding);
    const lines = content.split('\n');
    const totalLines = lines.length;

    // 处理行范围
    let start = startLine ? Math.max(1, startLine) : 1;
    let end = endLine ? Math.min(totalLines, endLine) : totalLines;

    if (start > end) {
      throw new Error('起始行号不能大于结束行号');
    }

    // 提取指定行的内容
    const selectedLines = lines.slice(start - 1, end);
    return selectedLines.join('\n');
  }
};