import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

interface SearchOptions {
  /** 搜索模式（content: 在文件内容中搜索，files: 通过文件名查找） */
  target: 'content' | 'files';
  /** 搜索内容（content模式：正则表达式；files模式：glob/fnmatch模式） */
  pattern: string;
  /** 搜索路径（相对于工作目录，默认 .） */
  path?: string;
  /** 文件过滤模式（content模式下使用，如 "*.ts" 仅搜索ts文件） */
  file_glob?: string;
  /** 最大返回结果数（默认 50） */
  limit?: number;
  /** 跳过前N个结果（用于分页，默认 0） */
  offset?: number;
  /** 输出模式 */
  output_mode?: 'content' | 'files_only' | 'count';
  /** 上下文行数（content模式下，每个匹配项前后显示的行数，默认 0） */
  context?: number;
}

interface SearchResult {
  success: boolean;
  total_count: number;
  returned_count: number;
  matches: Array<{
    path: string;
    line_number?: number;
    line?: string;
    lines_before?: string[];
    lines_after?: string[];
  }>;
  error?: string;
}

export const searchFilesTool: Tool = {
  definition: {
    name: 'utils_search_files',
    groupName: '基础工具',
    description: '搜索代码和文件 - 支持在文件内容中搜索（正则匹配）或按文件名查找（glob模式），类似 ripgrep 的体验',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['content', 'files'],
          description: '搜索目标：content（在文件内容中搜索，pattern为正则表达式）、files（按文件名查找，pattern为glob/fnmatch模式）',
        },
        pattern: {
          type: 'string',
          description: '搜索模式：content模式为正则表达式（如 "function.*getUser"），files模式为glob/fnmatch模式（如 "*.ts"、"*config*"）',
        },
        path: {
          type: 'string',
          description: '搜索路径（相对于工作目录，默认当前目录）',
          default: '.',
        },
        file_glob: {
          type: 'string',
          description: '文件类型过滤（content模式下使用），例如 "*.ts" 只搜索TypeScript文件，"*.py" 只搜索Python文件',
        },
        limit: {
          type: 'integer',
          description: '最大返回结果数（默认 50，最大 200）',
          default: 50,
        },
        offset: {
          type: 'integer',
          description: '跳过前N个结果（用于分页，默认 0）',
          default: 0,
        },
        output_mode: {
          type: 'string',
          enum: ['content', 'files_only', 'count'],
          description: 'content（默认）：返回匹配行内容；files_only：只返回匹配的文件名；count：只返回每个文件的匹配次数',
          default: 'content',
        },
        context: {
          type: 'integer',
          description: '每个匹配项前后显示的行数（content模式下有效，默认 0）',
          default: 0,
        },
      },
      required: ['target', 'pattern'],
    },
    guidelines: [
      'content模式使用正则表达式搜索文件内容，files模式使用glob模式按文件名查找',
      'content模式下可以用 file_glob 限制搜索的文件类型',
      '启用 context 参数可以查看匹配行前后的代码上下文',
      '结果默认按修改时间排序（最新的在前）',
      '支持分页查询（使用 offset 和 limit）',
      'content模式适合查找函数、变量引用等；files模式适合找配置文件或特定类型的文件',
    ],
  },

  async execute(parameters: Record<string, any>): Promise<SearchResult> {
    const {
      target,
      pattern,
      path: searchPath = '.',
      file_glob,
      limit = 50,
      offset = 0,
      output_mode = 'content',
      context = 0,
    } = parameters as unknown as SearchOptions;

    const resolvedPath = configManager.validatePath(searchPath, true);

    const maxLimit = Math.min(limit, 200);

    if (target === 'files') {
      return searchFiles(resolvedPath, pattern, maxLimit, offset);
    } else {
      return searchContent(resolvedPath, pattern, file_glob, maxLimit, offset, output_mode, context);
    }
  },
};

/**
 * 按文件名搜索文件（使用简单的模式匹配）
 */
async function searchFiles(
  rootPath: string,
  pattern: string,
  limit: number,
  offset: number
): Promise<SearchResult> {
  const matches: SearchResult['matches'] = [];
  const walkDir = async (dirPath: string) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (matches.length >= limit + offset) return;
        if (item.name.startsWith('.')) continue; // 跳过隐藏文件
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          if (['node_modules', '.git', '__pycache__', 'venv', 'dist', 'build'].includes(item.name)) continue;
          await walkDir(fullPath);
        } else if (fileMatchesPattern(item.name, pattern)) {
          const relativePath = path.relative(configManager.getConfig().workspaceDir, fullPath);
          matches.push({ path: relativePath });
        }
      }
    } catch {
      // 跳过无权限目录
    }
  };

  await walkDir(rootPath);
  const sliced = matches.slice(offset, offset + limit);
  return {
    success: true,
    total_count: matches.length,
    returned_count: sliced.length,
    matches: sliced,
  };
}

/**
 * 简单文件名模式匹配（支持 * 和 ? 通配符）
 */
function fileMatchesPattern(filename: string, pattern: string): boolean {
  // 将glob模式转换为正则
  const regexStr = pattern
    .replace(/\//g, '\\/')  // 转义路径分隔符
    .replace(/\./g, '\\.')  // 转义点号
    .replace(/\*/g, '.*')   // * -> .*
    .replace(/\?/g, '.');   // ? -> .
  try {
    return new RegExp(`^${regexStr}$`).test(filename);
  } catch {
    return filename.includes(pattern);
  }
}

/**
 * 在文件内容中搜索（按行正则匹配）
 */
async function searchContent(
  rootPath: string,
  pattern: string,
  fileGlob: string | undefined,
  limit: number,
  offset: number,
  outputMode: 'content' | 'files_only' | 'count',
  contextLines: number
): Promise<SearchResult> {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'g');
  } catch {
    return {
      success: false,
      total_count: 0,
      returned_count: 0,
      matches: [],
      error: `无效的正则表达式: ${pattern}`,
    };
  }

  const fileFilter = fileGlob ? buildFileFilter(fileGlob) : () => true;
  const result: SearchResult['matches'] = [];
  const fileCountMap = new Map<string, number>();

  const walkDir = async (dirPath: string) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          if (['node_modules', '.git', '__pycache__', 'venv', 'dist', 'build'].includes(item.name)) continue;
          await walkDir(fullPath);
        } else if (fileFilter(item.name)) {
          const relativePath = path.relative(configManager.getConfig().workspaceDir, fullPath);
          const count = await searchInFile(fullPath, relativePath, regex);
          if (count > 0) {
            fileCountMap.set(relativePath, count);
          }
        }
      }
    } catch {
      // 跳过无权限目录
    }
  };

  await walkDir(rootPath);

  if (outputMode === 'count') {
    for (const [filePath, count] of fileCountMap) {
      result.push({ path: filePath, line_number: count });
    }
  } else if (outputMode === 'files_only') {
    for (const [filePath] of fileCountMap) {
      result.push({ path: filePath });
    }
  } else {
    // content mode: 重新遍历收集具体匹配行
    for (const [filePath] of fileCountMap) {
      if (result.length >= limit + offset) break;
      const fullPath = path.resolve(configManager.getConfig().workspaceDir, filePath);
      const lines = (await fs.readFile(fullPath, 'utf-8').catch(() => '')).split('\n');
      for (let i = 0; i < lines.length && result.length < limit + offset; i++) {
        if (regex.test(lines[i])) {
          const matchEntry: SearchResult['matches'][number] = {
            path: filePath,
            line_number: i + 1,
            line: lines[i],
          };
          if (contextLines > 0) {
            const before = lines.slice(Math.max(0, i - contextLines), i);
            const after = lines.slice(i + 1, i + 1 + contextLines);
            if (before.length) matchEntry.lines_before = before;
            if (after.length) matchEntry.lines_after = after;
          }
          result.push(matchEntry);
        }
        // 重置正则状态
        regex.lastIndex = 0;
      }
    }
  }

  const sliced = result.slice(offset, offset + limit);
  return {
    success: true,
    total_count: result.length,
    returned_count: sliced.length,
    matches: sliced,
  };
}

/**
 * 构建文件过滤函数（从glob模式）
 */
function buildFileFilter(glob: string): (name: string) => boolean {
  // 把 *.ts 转成 .ts$，直接把前缀模式转成通配
  const regexStr = glob
    .replace(/\//g, '\\/')
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  try {
    const re = new RegExp(`^${regexStr}$`);
    return (name: string) => re.test(name);
  } catch {
    return (name: string) => name.endsWith(glob.replace('*', ''));
  }
}

/**
 * 在单个文件中搜索匹配数
 */
async function searchInFile(fullPath: string, _relativePath: string, regex: RegExp): Promise<number> {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    let count = 0;
    for (const line of lines) {
      regex.lastIndex = 0;
      if (regex.test(line)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}
