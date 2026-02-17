import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const deleteFileTool: Tool = {
  definition: {
    name: 'delete_file',
    description: '删除文件或空目录',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要删除的文件或目录路径（相对于工作目录）'
        },
        recursive: {
          type: 'boolean',
          description: '是否递归删除目录及其内容（可选，默认false）',
          default: false
        },
        force: {
          type: 'boolean',
          description: '是否强制删除（忽略不存在的文件错误，可选，默认false）',
          default: false
        }
      },
      required: ['path']
    }
  },

  async execute(parameters: Record<string, any>): Promise<string> {
    const filePath = parameters.path;
    const recursive = parameters.recursive || false;
    const force = parameters.force || false;

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, !force); // 如果force为true，不要求路径必须存在

    try {
      // 检查路径是否存在
      try {
        await fs.access(resolvedPath);
      } catch (error) {
        if (force) {
          return `路径 ${filePath} 不存在，由于 force=true，操作成功完成`;
        }
        throw new Error(`路径不存在: ${filePath}`);
      }

      // 获取文件/目录状态
      const stats = await fs.stat(resolvedPath);

      if (stats.isDirectory()) {
        // 如果是目录，检查是否为空
        if (!recursive) {
          const files = await fs.readdir(resolvedPath);
          if (files.length > 0) {
            throw new Error(`目录 ${filePath} 不为空。使用 recursive=true 来删除非空目录`);
          }
        }
        await fs.rm(resolvedPath, { recursive, force: true });
        return `目录 ${filePath} 删除成功`;
      } else {
        // 如果是文件，直接删除
        await fs.unlink(resolvedPath);
        return `文件 ${filePath} 删除成功`;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' && force) {
        return `路径 ${filePath} 不存在，由于 force=true，操作成功完成`;
      }
      throw error;
    }
  }
};
