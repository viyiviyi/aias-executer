import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const listDirectoryTool: Tool = {
  definition: {
    name: 'list_directory',
    description: '获取目录内容，支持是否获取目录树，跳过隐藏目录和特定目录',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目录路径（相对于工作目录）',
          default: '.'
        },
        recursive: {
          type: 'boolean',
          description: '是否递归获取目录树（可选）',
          default: false
        },
        skip_hidden: {
          type: 'boolean',
          description: '是否跳过隐藏文件和目录（可选）',
          default: true
        },
        skip_dirs: {
          type: 'array',
          items: { type: 'string' },
          description: '要跳过的目录名列表（可选）',
          default: ['venv', 'node_modules', '.git', '__pycache__', '.idea', '.vscode']
        }
      },
      required: []
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const dirPath = parameters.path || '.';
    const recursive = parameters.recursive || false;
    const skipHidden = parameters.skip_hidden !== false;
    const skipDirs = parameters.skip_dirs || ['venv', 'node_modules', '.git', '__pycache__', '.idea', '.vscode'];

    // 验证路径
    const resolvedPath = configManager.validatePath(dirPath, true);

    // 检查是否是目录
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`路径不是目录: ${dirPath}`);
    }

    if (recursive) {
      return await this.listDirectoryRecursive(resolvedPath, skipHidden, skipDirs);
    } else {
      return await this.listDirectorySimple(resolvedPath, skipHidden, skipDirs);
    }
  },

  async listDirectorySimple(dirPath: string, skipHidden: boolean, skipDirs: string[]): Promise<any> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      const itemName = item.name;
      
      // 跳过隐藏文件/目录
      if (skipHidden && itemName.startsWith('.')) {
        continue;
      }

      // 跳过特定目录
      if (item.isDirectory() && skipDirs.includes(itemName)) {
        continue;
      }

      const fullPath = path.join(dirPath, itemName);
      const stats = await fs.stat(fullPath);

      result.push({
        name: itemName,
        type: item.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    }

    return {
      path: dirPath,
      items: result,
      count: result.length
    };
  },

  async listDirectoryRecursive(dirPath: string, skipHidden: boolean, skipDirs: string[]): Promise<any> {
    const result = {
      path: dirPath,
      items: [] as any[],
      directories: [] as string[]
    };

    const walk = async (currentPath: string, depth: number) => {
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const itemName = item.name;
        const fullPath = path.join(currentPath, itemName);
        const relativePath = path.relative(dirPath, fullPath);

        // 跳过隐藏文件/目录
        if (skipHidden && itemName.startsWith('.')) {
          continue;
        }

        // 跳过特定目录
        if (item.isDirectory() && skipDirs.includes(itemName)) {
          continue;
        }

        const stats = await fs.stat(fullPath);
        const itemInfo = {
          name: itemName,
          path: relativePath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          depth
        };

        result.items.push(itemInfo);

        if (item.isDirectory()) {
          result.directories.push(relativePath);
          await walk(fullPath, depth + 1);
        }
      }
    };

    await walk(dirPath, 0);
    return result;
  }
};