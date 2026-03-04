import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const sendSignalTool: Tool = {
  definition: {
    name: 'terminal_send_signal',
    groupName: '终端',
    description: '向终端发送信号（仅在使用 pty 时可用）',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID',
        },
        signal: {
          type: 'string',
          description: '信号类型',
          enum: ['SIGINT', 'SIGTSTP', 'SIGQUIT', 'SIGKILL'],
          default: 'SIGINT',
        },
      },
      required: ['terminal_id', 'signal'],
    },
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const terminalId = parameters.terminal_id;
      const signal = parameters.signal;

      if (!terminalId) {
        throw new Error('terminal_id参数不能为空');
      }

      const result = terminalManager.sendSignal(terminalId, signal);

      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发送信号失败'
      };
    }
  },
};