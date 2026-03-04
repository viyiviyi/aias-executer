import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const resizeTerminalTool: Tool = {
  definition: {
    name: 'terminal_resize',
    groupName: '终端',
    description: '调整终端尺寸（仅在使用 pty 时可用）',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID',
        },
        cols: {
          type: 'integer',
          description: '终端列数',
          default: 80,
          minimum: 20,
          maximum: 500,
        },
        rows: {
          type: 'integer',
          description: '终端行数',
          default: 24,
          minimum: 10,
          maximum: 100,
        },
      },
      required: ['terminal_id', 'cols', 'rows'],
    },
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const terminalId = parameters.terminal_id;
      const cols = parameters.cols;
      const rows = parameters.rows;

      if (!terminalId) {
        throw new Error('terminal_id参数不能为空');
      }

      const result = terminalManager.resizeTerminal(terminalId, cols, rows);

      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调整终端尺寸失败'
      };
    }
  },
};