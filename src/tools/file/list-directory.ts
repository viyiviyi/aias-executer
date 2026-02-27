import fs from 'fs/promises';
import path from 'path';
import { FileErrors, validateParameters } from '../../core/error-utils';
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
          description: '是否查看文件字数和行数（可选，默认false，打开时会影响性能）',
          default: false
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
      tags: ['file', 'directory', 'list', 'explore'] // 工具标签
    },
    
    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: { 
          type: 'array', 
          description: '目录内容列表',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '文件或目录名' },
              type: { type: 'string', enum: ['directory', 'file'], description: '类型' },
              size: { type: 'integer', description: '大小（字节）' },
              modified: { type: 'string', description: '修改时间' },
              fullPath: { type: 'string', description: '完整路径' },
              depth: { type: 'integer', description: '深度（递归时）' },
              wordCount: { type: 'integer', description: '字数统计' },
              lineCount: { type: 'integer', description: '行数统计' }
            },
            required: ['name', 'type', 'size', 'modified']
          }
        },
        path: { type: 'string', description: '查询的目录路径' },
        recursive: { type: 'boolean', description: '是否递归查询' },
        count: { type: 'integer', description: '项目总数' }
      },
      required: ['success', 'result', 'path', 'count']
    },
    
    // 示例用法
    examples: [
      {
        description: '列出当前目录内容',
        parameters: { path: '.' },
        expectedOutput: {
          success: true,
          result: [
            { name: 'file1.txt', type: 'file', size: 1024, modified: '2024-01-01T00:00:00.000Z' },
            { name: 'folder1', type: 'directory', size: 0, modified: '2024-01-01T00:00:00.000Z' }
          ],
          path: '.',
          count: 2
        }
      },
      {
        description: '递归列出目录树',
        parameters: { path: '.', recursive: true },
        expectedOutput: {
          success: true,
          result: [
            { name: 'file1.txt', type: 'file', size: 1024, modified: '2024-01-01T00:00:00.000Z', depth: 0 },
            { name: 'folder1', type: 'directory', size: 0, modified: '2024-01-01T00:00:00.000Z', depth: 0 },
            { name: 'subfile.txt', type: 'file', size: 512, modified: '2024-01-01T00:00:00.000Z', depth: 1 }
          ],
          path: '.',
          recursive: true,
          count: 3
        }
      }
    ],
    
    // 使用指南
    guidelines: [
      '默认跳过隐藏文件和常见开发目录（如node_modules、.git等）',
      '递归查询可能影响性能，建议只在必要时使用',
      '可以配置要跳过的目录列表',
      '可以启用字数统计，但会影响性能'
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    // 参数验证
    validateParameters(parameters, ['path'], {
      recursive: (value) => typeof value === 'boolean',
      skip_hidden: (value) => typeof value === 'boolean',
      skip_dirs: (value) => Array.isArray(value),
      count_stats: (value) => typeof value === 'boolean'
    });

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
      throw FileErrors.invalidType(dirPath, ['directory']);
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