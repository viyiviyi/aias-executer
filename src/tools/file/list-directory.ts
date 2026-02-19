import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

interface DirectoryItem {
  name: string;
  type: 'directory' | 'file';
  size: number;
  modified: string;
  fullPath?: string;
  depth?: number;
  wordCount?: number; // 新增：字数统计
  lineCount?: number; // 新增：行数统计
}

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
          description: '是否递归获取目录树（可选,建议不递归获取）',
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
        },
        count_stats: {
          type: 'boolean',
          description: '是否统计文件字数和行数（可选，默认false，打开时会影响性能）',
          default: false
        }
      },
      required: ['path']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const dirPath = parameters.path || '.';
    const recursive = parameters.recursive || false;
    const skipHidden = parameters.skip_hidden !== false;
    const skipDirs = parameters.skip_dirs || ['venv', 'node_modules', '.git', '__pycache__', '.idea', '.vscode'];
    const countStats = parameters.count_stats || false;
    // 保存原始路径用于相对路径计算
    const originalPath = dirPath;

    // 验证路径
    const resolvedPath = configManager.validatePath(dirPath, true);

    // 检查是否是目录
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`路径不是目录: ${dirPath}`);
    }
    if (recursive) {
      const result = await listDirectoryRecursive(resolvedPath, originalPath, skipHidden, skipDirs, countStats);
      return {
        success: true,
        result: result
      };
    } else {
      const result = await listDirectorySimple(resolvedPath, skipHidden, skipDirs, countStats);
      return {
        success: true,
        result: result
      };
    }
  }
};

// 辅助函数 - 计算文件字数和行数
async function calculateFileStats(filePath: string): Promise<{wordCount: number, lineCount: number}> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').length;
    // 字数统计：去除空白字符后的字符数
    const wordCount = content.replace(/\s+/g, '').length;
    return { wordCount, lineCount };
  } catch (error) {
    // 如果无法读取文件（如二进制文件），返回0
    return { wordCount: 0, lineCount: 0 };
  }
}

// 辅助函数 - 简单列表
async function listDirectorySimple(dirPath: string, skipHidden: boolean, skipDirs: string[], countStats: boolean): Promise<any> {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const result: DirectoryItem[] = [];
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

    // 计算相对于原始路径的相对路径
    const relativePath = path.relative(dirPath, fullPath);
    // 如果相对路径为空（当前目录），使用文件名
    const displayPath = relativePath === '' ? itemName : relativePath;
    
    const itemInfo: DirectoryItem = {
      name: itemName,
      fullPath: displayPath,
      type: item.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime.toISOString()
    };
    if (item.isFile() && countStats) {
      const { wordCount, lineCount } = await calculateFileStats(fullPath);
      itemInfo.wordCount = wordCount;
      itemInfo.lineCount = lineCount;
    }
    
    result.push(itemInfo);
  }

  return {
    path: dirPath,
    items: result,
    count: result.length
  };
}

// 辅助函数 - 递归列表
async function listDirectoryRecursive(dirPath: string, originalPath: string, skipHidden: boolean, skipDirs: string[], countStats: boolean): Promise<any> {
  const result = {
    absolute_path: dirPath,
    originalPath,
    items: [] as DirectoryItem[],
    directories: [] as string[]
  };

  const walk = async (currentPath: string, depth: number) => {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemName = item.name;
      const fullPath = path.join(currentPath, itemName);

      // 跳过隐藏文件/目录
      if (skipHidden && itemName.startsWith('.')) {
        continue;
      }

      // 跳过特定目录
      if (item.isDirectory() && skipDirs.includes(itemName)) {
        continue;
      }

      const stats = await fs.stat(fullPath);
      // 计算相对于原始路径的相对路径
      const relativePath = path.relative(dirPath, fullPath);
      // 如果相对路径为空（当前目录），使用文件名
      const displayPath = relativePath === '' ? itemName : relativePath;
      
      const itemInfo: DirectoryItem = {
        name: itemName,
        fullPath: displayPath,
        type: item.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        depth
      };
      
      if (item.isFile() && countStats) {
        const { wordCount, lineCount } = await calculateFileStats(fullPath);
        itemInfo.wordCount = wordCount;
        itemInfo.lineCount = lineCount;
      }
      
      result.items.push(itemInfo);

      if (item.isDirectory()) {
        await walk(fullPath, depth + 1);
      }
    }
  };

  await walk(dirPath, 0);
  return result;
}

// 将辅助函数附加到工具对象
Object.assign(listDirectoryTool, {
  listDirectorySimple,
  listDirectoryRecursive
});