import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const listTerminalsTool: Tool = {
  definition: {
    name: 'terminals_list',
    groupName: '终端',
    description: '列出所有活动的终端会话',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  async execute(): Promise<any> {
    try {
      const terminals = terminalManager.listTerminals();
      
      return {
        success: true,
        result: {
          terminals: terminals,
          count: terminals.length,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '列出终端失败'
      };
    }
  },
};