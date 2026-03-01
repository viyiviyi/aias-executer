import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const listTerminalsTool: Tool = {
  definition: {
    name: 'list_terminals',
    description: '列出所有活动的终端会话',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  async execute(): Promise<any> {
    return {
      terminals: terminalManager.listTerminals(),
      count: terminalManager.listTerminals().length,
    };
  },
};