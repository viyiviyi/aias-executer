import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const closeTerminalTool: Tool = {
  definition: {
    name: 'terminal_close',
    groupName: '终端',
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
    try {
      const terminalId = parameters.terminal_id;

      if (!terminalId) {
        throw new Error('terminal_id参数不能为空');
      }

      const result = terminalManager.closeTerminal(terminalId);
      
      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '关闭终端失败'
      };
    }
  },
};