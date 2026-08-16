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
  /** 返回代码块时包含的上下文行数（默认 30） */
  context_lines?: number;
}

interface PatchResult {
  success: boolean;
  message: string;
  match_count: number;
  /** 修改前该区域代码块（带行号，包含上下文） */
  before: string;
  /** 修改后该区域代码块（带行号，包含上下文） */
  after: string;
  /** 修改的行范围（新文件中的行号） */
  changed_lines: string;
  /** before 代码块的起始行号 */
  context_start_line: number;
  /** 修改前文件总行数 */
  original_line_count: number;
  /** 修改后文件总行数 */
  new_line_count: number;
  path: string;
}

interface Match {
  /** 在文件内容中的起始索引（0-based） */
  index: number;
  /** 匹配到的原文（与文件内容完全一致的片段） */
  text: string;
}

export const patchFileTool: Tool = {
  definition: {
    name: 'utils_patch_file',
    groupName: '基础工具',
    description:
      '在代码文件中执行查找-替换编辑。先精确定位 old_string，再替换为新内容。支持忽略空白差异的模糊匹配，但只匹配连续行块，绝不跨越无关代码',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）',
        },
        old_string: {
          type: 'string',
          description:
            '要查找替换的原始文本。必须提供足以上下文保证唯一性，建议包含前后文各一行。支持多行（\\n）。',
        },
        new_string: {
          type: 'string',
          description: '替换后的新文本。如果为空字符串，则删除匹配到的文本。',
          default: '',
        },
        replace_all: {
          type: 'boolean',
          description:
            '是否替换所有匹配项（默认 false）。为 true 时不要求 old_string 唯一；为 false 时必须唯一匹配否则报错',
          default: false,
        },
        context_lines: {
          type: 'integer',
          description: '返回的 before/after 代码块中，修改点上下各包含多少行上下文（默认 30）',
          default: 30,
        },
      },
      required: ['path', 'old_string'],
    },
    guidelines: [
      'old_string 需要提供足够上下文以保证唯一性，建议包含前后文各一行',
      '模糊匹配仅忽略空白差异（缩进、空格），且只在连续行块内匹配，不会跨越无关代码',
      '返回 before（修改前代码块）和 after（修改后代码块），均带行号和上下文',
      'replace_all=true 时谨慎使用，可能修改多处',
    ],
  },

  async execute(parameters: Record<string, any>): Promise<PatchResult> {
    const {
      path: filePath,
      old_string,
      new_string = '',
      replace_all = false,
      context_lines = 30,
    } = parameters as PatchOptions;

    const fail = (message: string, partial?: Partial<PatchResult>): PatchResult => ({
      success: false,
      message,
      match_count: 0,
      before: '',
      after: '',
      changed_lines: '',
      context_start_line: 0,
      original_line_count: 0,
      new_line_count: 0,
      path: filePath,
      ...partial,
    });

    if (!old_string) {
      return fail('old_string 不能为空');
    }

    const resolvedPath = configManager.validatePath(filePath, true);

    // 读取文件内容
    let content: string;
    try {
      content = await fs.readFile(resolvedPath, 'utf-8');
    } catch (error: any) {
      return fail(`无法读取文件: ${error.message}`);
    }

    // 查找匹配（精确优先，其次连续行块模糊匹配）
    const matches = findMatches(content, old_string);

    if (matches.length === 0) {
      return fail(
        '未在文件中找到匹配的文本。请检查 old_string 是否准确（注意全角半角、大小写差异）'
      );
    }

    if (!replace_all && matches.length > 1) {
      return fail(
        `找到 ${matches.length} 处匹配。old_string 不够唯一，请添加更多上下文，或设置 replace_all=true`,
        { match_count: matches.length }
      );
    }

    const selected = replace_all ? matches : [matches[0]];

    // 执行替换（从后往前，避免位置偏移）
    let newContent = content;
    for (let i = selected.length - 1; i >= 0; i--) {
      const m = selected[i];
      newContent =
        newContent.slice(0, m.index) +
        new_string +
        newContent.slice(m.index + m.text.length);
    }

    // 写入文件
    try {
      await fs.writeFile(resolvedPath, newContent, 'utf-8');
    } catch (error: any) {
      return fail(`写入文件失败: ${error.message}`, { match_count: selected.length });
    }

    // 计算修改位置的行号（基于第一个匹配）
    const first = selected[0];
    const startLine = content.slice(0, first.index).split('\n').length; // 1-based
    const oldTextLines = first.text.split('\n').length;
    const endLine = startLine + oldTextLines - 1;

    // 构建修改前代码块
    const oldLines = content.split('\n');
    const oldStart = Math.max(1, startLine - context_lines);
    const oldEnd = Math.min(oldLines.length, endLine + context_lines);
    const before = oldLines
      .slice(oldStart - 1, oldEnd)
      .map((line, idx) => `${oldStart + idx}┆${line}`)
      .join('\n');

    // 构建修改后代码块（新文件中的对应区域）
    const newLines = newContent.split('\n');
    const newTextLines = new_string.split('\n').length;
    const newEndLine = startLine + newTextLines - 1;
    const newStart = Math.max(1, startLine - context_lines);
    const newEnd = Math.min(newLines.length, newEndLine + context_lines);
    const after = newLines
      .slice(newStart - 1, newEnd)
      .map((line, idx) => `${newStart + idx}┆${line}`)
      .join('\n');

    return {
      success: true,
      message: replace_all ? `已替换 ${selected.length} 处匹配` : '替换成功',
      match_count: selected.length,
      before,
      after,
      changed_lines: `${startLine} ~ ${newEndLine}`,
      context_start_line: oldStart,
      original_line_count: oldLines.length,
      new_line_count: newLines.length,
      path: filePath,
    };
  },
};

/**
 * 查找所有匹配：
 * 1. 精确匹配（indexOf）
 * 2. 行级模糊匹配：old_string 按行拆分，每行 trim + 压缩空白后，
 *    在文件中找连续的行块（仅允许空白差异，文本必须一致）
 */
function findMatches(content: string, oldString: string): Match[] {
  const matches: Match[] = [];

  // 策略1：精确匹配
  let pos = content.indexOf(oldString);
  while (pos !== -1) {
    matches.push({ index: pos, text: oldString });
    pos = content.indexOf(oldString, pos + oldString.length);
  }
  if (matches.length > 0) return matches;

  // 策略2：行级模糊匹配（连续行块，每行忽略空白差异）
  // 按行严格对齐：行数、行边界必须一致，仅允许行内空白（缩进/空格）差异
  const needleLines = oldString.split('\n').map(normalizeLine);
  const contentLines = content.split('\n');
  const contentStartOffsets: number[] = [0];
  for (const line of contentLines) {
    contentStartOffsets.push(contentStartOffsets[contentStartOffsets.length - 1] + line.length + 1);
  }

  const fileLinesNorm = contentLines.map(normalizeLine);

  for (let i = 0; i + needleLines.length <= fileLinesNorm.length; i++) {
    let ok = true;
    for (let j = 0; j < needleLines.length; j++) {
      if (fileLinesNorm[i + j] !== needleLines[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const startIdx = contentStartOffsets[i];
      const text = contentLines.slice(i, i + needleLines.length).join('\n');
      matches.push({ index: startIdx, text });
      // 跳过已匹配的行，避免重叠匹配
      i += needleLines.length - 1;
    }
  }

  return matches;
}

/**
 * 行归一化：trim 并将连续空白压缩为单个空格
 */
function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}
