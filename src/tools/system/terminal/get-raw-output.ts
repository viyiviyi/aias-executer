import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const getRawOutputTool: Tool = {
  definition: {
    name: 'terminal_get_raw_output',
    groupName: '终端',
    description: '获取终端原始输出（包含控制字符，仅在使用 pty 时可用）',
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
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    try {
      const terminalId = parameters.terminal_id;

      if (!terminalId) {
        throw new Error('terminal_id参数不能为空');
      }

      const result = terminalManager.getRawTerminalOutput(terminalId);

      return {
        success: true,
        result: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取原始输出失败'
      };
    }
  },
};