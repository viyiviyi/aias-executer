import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';
import path from 'path';
import iconv from 'iconv-lite';

const execAsync = promisify(exec);
const configManager = ConfigManager.getInstance();

// 辅助函数：截断文本到指定行数，并添加截断标识
function truncateText(text: string, maxLines: number = 100): string {
  if (!text) return text;

  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }

  // 保留最后maxLines行
  const truncatedLines = lines.slice(-maxLines);
  // 添加截断标识
  const truncatedText = `[内容过长被截断，只显示最后${maxLines}行，共${lines.length}行]\n${truncatedLines.join('\n')}`;

  return truncatedText;
}

// 辅助函数：获取系统编码
function getSystemEncoding(): string {
  // Windows系统：根据代码页判断
  if (process.platform === 'win32') {
    try {
      // 执行chcp命令获取代码页
      const { execSync } = require('child_process');
      const result = execSync('chcp', { encoding: 'utf-8' });
      const match = result.match(/\d+/);
      if (match) {
        const codePage = parseInt(match[0]);
        // 常见代码页映射
        switch (codePage) {
          case 65001: // UTF-8
            return 'utf-8';
          case 936: // GBK (简体中文)
            return 'gbk';
          case 950: // Big5 (繁体中文)
            return 'big5';
          case 932: // Shift-JIS (日文)
            return 'shiftjis';
          case 949: // EUC-KR (韩文)
            return 'euc-kr';
          default:
            // 其他代码页，默认使用GBK
            return 'gbk';
        }
      }
    } catch (error: any) {
      // 如果获取失败，使用默认编码
      console.warn('无法获取系统代码页，使用默认编码:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // 非Windows系统或获取失败，根据环境变量判断
  const lang = process.env.LANG || process.env.LC_ALL || process.env.LC_CTYPE;
  if (lang && lang.toLowerCase().includes('utf-8')) {
    return 'utf-8';
  }
  
  // 默认使用UTF-8
  return 'utf-8';
}

// 辅助函数：尝试多种编码解码buffer
function decodeBuffer(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) {
    return '';
  }
  
  // 获取系统编码
  const systemEncoding = getSystemEncoding();
  
  // 如果是Windows且代码页是65001（UTF-8），直接使用UTF-8解码
  if (process.platform === 'win32' && systemEncoding === 'utf-8') {
    try {
      return iconv.decode(buffer, 'utf-8');
    } catch (e) {
      // 如果UTF-8解码失败，尝试其他编码
    }
  }
  
  // 尝试的编码顺序：系统编码优先，然后是其他常见编码
  const encodings: string[] = [
    systemEncoding,
    'utf-8',
    'gbk',
    'gb2312',
    'cp936',
    'big5',
    'latin1',
    'ascii'
  ];
  
  // 去重
  const uniqueEncodings = [...new Set(encodings)];
  
  for (const encoding of uniqueEncodings) {
    try {
      const decoded = iconv.decode(buffer, encoding);
      // 检查是否包含过多的空字符（二进制文件的特征）
      const nullCount = (decoded.match(/\x00/g) || []).length;
      const nullRatio = nullCount / decoded.length;
      
      // 如果空字符比例小于5%，认为是有效的文本
      if (nullRatio < 0.05) {
        return decoded;
      }
    } catch (e) {
      // 尝试下一个编码
      continue;
    }
  }
  
  // 如果所有编码都失败，使用utf-8并替换无效字符
  return iconv.decode(buffer, 'utf-8').replace(/[^\x00-\x7F]/g, '?');
}

export const executeCommandTool: Tool = {
  definition: {
    name: 'utils_execute_command',
    groupName: '基础工具',
    description:
      '执行命令行命令（命令行执行结束或超时后相关进程会退出，不可执行需要后台运行的命令）',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的命令',
        },
        workdir: {
          type: 'string',
          description: '工作目录（可选，建议使用此参数而不是cd命令）',
          default: '.',
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒，可选）',
          default: 300,
          minimum: 1,
          maximum: 300,
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '环境变量（可选）',
        },
      },
      required: ['command'],
    },
    // 使用指南
    guidelines: [
      '用于执行命令行，执行前需要确定操作系统信息',
      '请勿执行危险操作，除非用户明确要求',
    ],
    result_use_type: 'last',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const command = parameters.command;
    const workdir = path.resolve(parameters.workdir || configManager.getConfig().workspaceDir);
    const timeout = parameters.timeout || 300;
    const env = parameters.env || {};

    if (!command) {
      throw new Error('command参数不能为空');
    }

    // 验证命令
    // 检查命令是否允许
    if (!configManager.isCommandAllowed(command)) {
      throw new Error(`命令不被允许: ${command}`);
    }

    // 验证工作目录
    const workdirPath = configManager.validatePath(workdir, true);

    // 验证超时时间
    if (timeout < 1 || timeout > 300) {
      throw new Error('timeout必须在1到300秒之间');
    }

    // 准备环境变量
    const fullEnv = { ...process.env, ...env };

    try {
      // 使用buffer模式获取原始输出，然后尝试多种编码解码
      const { stdout, stderr } = await execAsync(command, {
        cwd: workdirPath,
        env: fullEnv,
        timeout: timeout * 1000,
        encoding: 'buffer', // 使用buffer模式
      });

      // 解码stdout和stderr
      const decodedStdout = decodeBuffer(stdout);
      const decodedStderr = decodeBuffer(stderr);

      // 合并stdout和stderr，应用截断功能
      const combinedOutput = decodedStdout + (decodedStderr ? '\n' + decodedStderr : '');
      const truncatedOutput = truncateText(combinedOutput);

      // 返回简洁的结果，只包含执行结果输出
      return {
        result: truncatedOutput.trim(),
        success: true,
      };
    } catch (error: any) {
      if (error.killed && error.signal === 'SIGTERM') {
        throw new Error(`命令执行超时 (${timeout}秒)`);
      }

      // 解码错误输出
      const errorStdout = error.stdout ? decodeBuffer(error.stdout) : '';
      const errorStderr = error.stderr ? decodeBuffer(error.stderr) : '';

      // 合并错误信息，应用截断功能
      const errorOutput =
        (errorStdout.trim() || '') +
        (errorStderr.trim() ? '\n' + errorStderr.trim() : '') +
        (error.message ? '\n' + error.message : '');
      const truncatedErrorOutput = truncateText(errorOutput);

      // 返回错误信息
      return {
        output: truncatedErrorOutput.trim(),
        success: false,
      };
    }
  },
};
