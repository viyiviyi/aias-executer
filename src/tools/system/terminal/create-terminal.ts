import { platform } from 'os';
import { TerminalManager } from '../../../core/terminal-manager';
import { Tool } from '@/types/tools/Tool';
import path from 'path';
import { ConfigManager } from '../../../core/config';

const terminalManager = TerminalManager.getInstance();
const configManager = ConfigManager.getInstance();

// 根据操作系统获取默认shell
function getDefaultShell(): string {
  const osPlatform = platform();
  if (osPlatform === 'win32') {
    return 'powershell';
  }
  return 'bash';
}

export const createTerminalTool: Tool = {
  definition: {
    name: 'terminal_create',
    groupName: '终端',
    description: '创建交互式终端会话（适合需要持续交互的命令，如长时间运行的进程、交互式程序等）',
    parameters: {
      type: 'object',
      properties: {
        shell: {
          type: 'string',
          description: 'Shell类型（Windows建议使用powershell，Linux建议使用bash，其他如cmd、zsh、sh等也可用）',
          default: 'bash',
        },
        workdir: {
          type: 'string',
          description: '工作目录',
          default: '.',
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '环境变量（可选）',
        },
        description: {
          type: 'string',
          description: '终端描述（可选）',
        },
        initial_command: {
          type: 'string',
          description: '初始命令（可选），创建终端后立即执行的命令',
        },
      },
      required: [],
    },
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const shell = parameters.shell || getDefaultShell();
      const workdir = path.resolve(parameters.workdir || configManager.getConfig().workspaceDir);
      const env = parameters.env || {};
      const description = parameters.description;
      const initialCommand = parameters.initial_command;

      const result = terminalManager.createTerminal(shell, workdir, env, description, initialCommand);
      
      // 确保返回格式正确
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      // 捕获并返回错误信息
      return {
        success: false,
        error: error.message || '创建终端失败'
      };
    }
  },
};