import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const writeFileTool: Tool = {
  definition: {
    name: 'write_file',
    description: '写入文件内容',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）'
        },
        content: {
          type: 'string',
          description: '要写入的内容'
        },
        encoding: {
          type: 'string',
          description: '文件编码（可选）',
          default: 'utf-8'
        },
        append: {
          type: 'boolean',
          description: '是否追加到文件末尾（可选）',
          default: false
        }
      },
      required: ['path', 'content']
    }
  },

  async execute(parameters: Record<string, any>): Promise<string> {
    const filePath = parameters.path;
    const content = parameters.content;
    const encoding = parameters.encoding || 'utf-8';
    const append = parameters.append || false;

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath);
    
    // 验证文件类型
    configManager.validateFileExtension(resolvedPath);

    // 确保目录存在
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    if (append) {
      await fs.appendFile(resolvedPath, content, encoding);
    } else {
      await fs.writeFile(resolvedPath, content, encoding);
    }

    return '文件写入成功';
  }
};