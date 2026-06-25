import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

interface PatchOptions {
  /** 文件路径（相对于工作目录） */
  path: string;
  /** 要查找的文本（必须唯一，除非 replace_all=true） */
  old_string: string;
  /** 替换为的文本。空字符串表示删除匹配的文本 */
  new_string?: string;
  /** 如果为 true，替换所有匹配项而不是要求唯一匹配（默认 false） */
  replace_all?: boolean;
}

interface PatchResult {
  success: boolean;
  diff: string;
  message: string;
  match_count: number;
}

export const patchFileTool: Tool = {
  definition: {
    name: 'utils_patch_file',
    groupName: '基础工具',
    description: '在代码文件中执行精确的查找-替换编辑。支持模糊匹配（忽略空白差异），适合对已有代码进行局部修改',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        old_string: {
          type: 'string',
          description: '要查找替换的原始文本。使用 find-and-replace 模式：先定位到要修改的位置（提供足以上下文保证唯一性），再替换为新内容。',
        },
        new_string: {
          type: 'string',
          description: '替换后的新文本。如果为空字符串，则删除匹配到的文本。',
          default: '',
        },
        replace_all: {
          type: 'boolean',
          description: '是否替换所有匹配项（默认 false）。当为 true 时，不要求 old_string 唯一。当为 false 时，必须唯一匹配否则报错',
          default: false,
        },
      },
      required: ['path', 'old_string'],
    },
    guidelines: [
      'old_string 需要提供足够上下文以保证唯一性，建议包含前后文各一行',
      '支持多行替换（old_string 和 new_string 可包含 \\n）',
      '返回统一的 diff 格式对比修改前后的变化',
      '编辑后自动进行语法检查（如果支持）',
      'replace_all=true 时谨慎使用，可能修改多处',
    ],
  },

  async execute(parameters: Record<string, any>): Promise<PatchResult> {
    const { path: filePath, old_string, new_string = '', replace_all = false } = parameters as PatchOptions;

    if (!old_string) {
      return {
        success: false,
        diff: '',
        message: 'old_string 不能为空',
        match_count: 0,
      };
    }

    const resolvedPath = configManager.validatePath(filePath, true);

    // 读取文件内容
    let content: string;
    try {
      content = await fs.readFile(resolvedPath, 'utf-8');
    } catch (error: any) {
      return {
        success: false,
        diff: '',
        message: `无法读取文件: ${error.message}`,
        match_count: 0,
      };
    }

    // 尝试精确匹配
    const exactMatches = countOccurrences(content, old_string);
    let newContent: string;
    let matchCount: number;

    if (exactMatches > 0) {
      if (!replace_all && exactMatches > 1) {
        return {
          success: false,
          diff: '',
          message: `找到 ${exactMatches} 处匹配。old_string 不够唯一，请添加更多上下文或设置 replace_all=true`,
          match_count: exactMatches,
        };
      }
      if (replace_all) {
        newContent = replaceAll(content, old_string, new_string);
        matchCount = exactMatches;
      } else {
        newContent = content.replace(old_string, new_string);
        matchCount = 1;
      }
    } else {
      // 精确匹配失败，尝试模糊匹配（忽略空白差异）
      const fuzzyResult = tryFuzzyMatch(content, old_string);
      if (!fuzzyResult) {
        return {
          success: false,
          diff: '',
          message: `未在文件中找到匹配的文本。请检查 old_string 是否准确，注意全角半角字符差异`,
          match_count: 0,
        };
      }

      if (!replace_all && fuzzyResult.matches > 1) {
        return {
          success: false,
          diff: '',
          message: `模糊匹配发现 ${fuzzyResult.matches} 处。old_string 不够唯一，请添加更多上下文`,
          match_count: fuzzyResult.matches,
        };
      }

      if (replace_all) {
        newContent = content.replace(fuzzyResult.pattern, new_string);
        matchCount = fuzzyResult.matches;
      } else {
        newContent = content.replace(fuzzyResult.pattern, new_string);
        matchCount = 1;
      }
    }

    // 生成 diff
    const diff = generateDiff(content, newContent, filePath);

    // 写入文件
    try {
      await fs.writeFile(resolvedPath, newContent, 'utf-8');
    } catch (error: any) {
      return {
        success: false,
        diff,
        message: `写入文件失败: ${error.message}`,
        match_count: matchCount,
      };
    }

    return {
      success: true,
      diff,
      message: replace_all
        ? `已替换 ${matchCount} 处匹配`
        : '替换成功',
      match_count: matchCount,
    };
  },
};

/**
 * 计算子串出现次数
 */
function countOccurrences(content: string, search: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    pos = content.indexOf(search, pos);
    if (pos === -1) break;
    count++;
    pos += search.length;
  }
  return count;
}

/**
 * 替换所有匹配（原生 replaceAll 更安全）
 */
function replaceAll(content: string, search: string, replacement: string): string {
  // 使用 split-join 方式（比正则更安全，不用考虑特殊字符转义）
  return content.split(search).join(replacement);
}

/**
 * 尝试模糊匹配（忽略空白差异）
 * 将 old_string 和内容的空白区域标准化后匹配
 */
function tryFuzzyMatch(content: string, oldString: string): { pattern: RegExp; matches: number } | null {
  // 将 old_string 中的空白字符转为可匹配任意空白（\s+）
  const escaped = escapeRegExp(oldString);
  const fuzzyPattern = escaped.replace(/\\\s+/g, '\\s+');
  const pattern = new RegExp(fuzzyPattern, 'g');
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    return { pattern, matches: matches.length };
  }

  // 进一步尝试：将 old_string 按行拆分，每行trim后匹配
  const lines = oldString.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  // 用第一行和最后一行定位
  const firstLineEscaped = escapeRegExp(lines[0]);
  const lastLineEscaped = lines.length > 1 ? escapeRegExp(lines[lines.length - 1]) : firstLineEscaped;

  // 构建允许中间任意内容的模式
  const fuzzyBlock = new RegExp(
    `${firstLineEscaped}[\\s\\S]*?${lastLineEscaped}`,
    'g'
  );
  const blockMatches = content.match(fuzzyBlock);
  if (blockMatches && blockMatches.length > 0) {
    return { pattern: fuzzyBlock, matches: blockMatches.length };
  }

  return null;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 生成统一的 diff 格式
 */
function generateDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // 简单的行级 diff
  let diff = `--- ${filePath}\n+++ ${filePath}\n`;
  let i = 0;
  while (i < Math.max(oldLines.length, newLines.length)) {
    if (oldLines[i] !== newLines[i]) {
      if (i < oldLines.length) diff += `-${oldLines[i]}\n`;
      if (i < newLines.length) diff += `+${newLines[i]}\n`;
    }
    i++;
  }
  return diff;
}
