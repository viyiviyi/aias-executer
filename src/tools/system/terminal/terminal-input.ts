import { Tool } from '@/types/tools/Tool';
import { TerminalManager } from '../../../core/terminal-manager';

const terminalManager = TerminalManager.getInstance();

export const terminalInputTool: Tool = {
  definition: {
    name: 'terminal_input',
    description: '向终端输入命令并等待输出（用于交互式终端会话）',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID',
        },
        input: {
          type: 'string',
          description: '输入的命令或文本',
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
      required: ['terminal_id', 'input'],
    },
    result_use_type: 'once',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;
    const input = parameters.input;
    const waitTimeout = parameters.wait_timeout || 30;
    const maxLines = parameters.max_lines || 100;

    if (!terminalId || !input) {
      throw new Error('terminal_id和input参数不能为空');
    }

    return await terminalManager.sendInput(terminalId, input, waitTimeout, maxLines);
  },
};