import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const execAsync = promisify(exec);
const configManager = ConfigManager.getInstance();

export const executeCommandTool: Tool = {
  definition: {
    name: 'execute_command',
    description: '执行命令行命令（即时执行，适合快速命令。需要交互式会话请使用终端工具）',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的命令'
        },
        workdir: {
          type: 'string',
          description: '工作目录（可选）',
          default: '.'
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒，可选）',
          default: 30,
          minimum: 1,
          maximum: 300
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '环境变量（可选）'
        }
      },
      required: ['command']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const command = parameters.command;
    const workdir = parameters.workdir || '.';
    const timeout = parameters.timeout || 30;
    const env = parameters.env || {};

    if (!command) {
      throw new Error('command参数不能为空');
    }

    // 验证命令
    const validatedCommand = configManager.validateCommand(command);

    // 验证工作目录
    const workdirPath = configManager.validatePath(workdir, true);

    // 验证超时时间
    if (timeout < 1 || timeout > 300) {
      throw new Error('timeout必须在1到300秒之间');
    }

    // 准备环境变量
    const fullEnv = { ...process.env, ...env };

    try {
      const { stdout, stderr } = await execAsync(validatedCommand, {
        cwd: workdirPath,
        env: fullEnv,
        timeout: timeout * 1000,
        encoding: 'utf-8'
      });

      // 返回精简的结果，只包含必要信息
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true
      };
    } catch (error: any) {
      if (error.killed && error.signal === 'SIGTERM') {
        throw new Error(`命令执行超时 (${timeout}秒)`);
      }

      // 返回错误信息，但不包含过多细节
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        success: false
      };
    }
  }
};