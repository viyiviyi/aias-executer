import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const closeTerminalTool: Tool = {
  definition: {
    name: 'close_terminal',
    description: '关闭终端会话',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID',
        },
      },
      required: ['terminal_id'],
    },
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;

    if (!terminalId) {
      throw new Error('terminal_id参数不能为空');
    }

    return terminalManager.closeTerminal(terminalId);
  },
};