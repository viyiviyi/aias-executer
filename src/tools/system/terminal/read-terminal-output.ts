import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const readTerminalOutputTool: Tool = {
  definition: {
    name: 'read_terminal_output',
    description: '主动读取终端输出',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID',
        },
        wait_timeout: {
          type: 'integer',
          description: '等待输出的超时时间（秒）',
          default: 30,
          minimum: 1,
          maximum: 60,
        },
        max_lines: {
          type: 'integer',
          description: '返回的最大行数',
          default: 100,
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['terminal_id'],
    },
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;
    const waitTimeout = parameters.wait_timeout || 30;
    const maxLines = parameters.max_lines || 100;

    if (!terminalId) {
      throw new Error('terminal_id参数不能为空');
    }

    return await terminalManager.readTerminalOutput(terminalId, waitTimeout, maxLines);
  },
};