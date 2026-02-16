import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';
import { TerminalInfo } from '../../types';

const configManager = ConfigManager.getInstance();

class TerminalManager {
  private static instance: TerminalManager;
  private terminals: Map<string, TerminalInfo> = new Map();
  private maxTerminals: number;

  private constructor() {
    const config = configManager.getConfig();
    this.maxTerminals = config.maxTerminals;
  }

  public static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  public createTerminal(
    shell: string = 'bash',
    workdir: string = '.',
    env: Record<string, string> = {},
    description?: string,
    initialCommand?: string
  ): { terminal_id: string } {
    // 检查终端数量限制
    if (this.terminals.size >= this.maxTerminals) {
      throw new Error(`已达到最大终端数限制: ${this.maxTerminals}`);
    }

    // 验证工作目录
    const workdirPath = configManager.validatePath(workdir, true);

    // 生成唯一ID
    const terminalId = uuidv4();

    try {
      // 准备环境变量
      const fullEnv = { ...process.env, ...env };

      // 创建子进程
      const childProcess = spawn(shell, [], {
        cwd: workdirPath,
        env: fullEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      // 保存终端信息
      this.terminals.set(terminalId, {
        id: terminalId,
        process: childProcess,
        workdir: workdirPath,
        shell,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        description
      });

      // 如果有初始命令，执行它
      if (initialCommand) {
        childProcess.stdin.write(initialCommand + '\n');
        childProcess.stdin.end();
      }

      return { terminal_id: terminalId };
    } catch (error: any) {
      throw new Error(`创建终端时出错: ${error.message}`);
    }
  }

  public sendInput(
    terminalId: string,
    input: string,
    waitTimeout: number = 30,
    maxLines: number = 30
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const terminal = this.terminals.get(terminalId);
      if (!terminal) {
        reject(new Error(`终端不存在: ${terminalId}`));
        return;
      }

      const { process } = terminal;
      
      // 检查进程是否还在运行
      if (process.exitCode !== null) {
        this.cleanupTerminal(terminalId);
        reject(new Error('终端进程已结束'));
        return;
      }

      // 更新活动时间
      terminal.lastActivity = Date.now();

      let output = '';
      let lineCount = 0;
      let timeoutId: NodeJS.Timeout;

      // 设置超时
      timeoutId = setTimeout(() => {
        process.stdout.removeAllListeners();
        process.stderr.removeAllListeners();
        resolve({
          output: output.trim(),
          line_count: lineCount,
          timeout: true
        });
      }, waitTimeout * 1000);

      // 收集输出
      const collectOutput = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            output += line + '\n';
            lineCount++;
            
            if (lineCount >= maxLines) {
              clearTimeout(timeoutId);
              process.stdout.removeAllListeners();
              process.stderr.removeAllListeners();
              resolve({
                output: output.trim(),
                line_count: lineCount,
                truncated: true
              });
              return;
            }
          }
        }
      };

      process.stdout.on('data', collectOutput);
      process.stderr.on('data', collectOutput);

      // 发送输入
      process.stdin.write(input + '\n');

      // 监听进程结束
      process.on('close', (code: number) => {
        clearTimeout(timeoutId);
        this.cleanupTerminal(terminalId);
        resolve({
          output: output.trim(),
          line_count: lineCount,
          exit_code: code,
          process_ended: true
        });
      });
    });
  }

  public closeTerminal(terminalId: string): { success: boolean } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    this.cleanupTerminal(terminalId);
    return { success: true };
  }

  private cleanupTerminal(terminalId: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      try {
        terminal.process.kill();
      } catch (error) {
        // 忽略清理错误
      }
      this.terminals.delete(terminalId);
    }
  }

  public listTerminals(): Array<{
    id: string;
    workdir: string;
    shell: string;
    created_at: number;
    last_activity: number;
    description?: string;
  }> {
    return Array.from(this.terminals.values()).map(terminal => ({
      id: terminal.id,
      workdir: terminal.workdir,
      shell: terminal.shell,
      created_at: terminal.createdAt,
      last_activity: terminal.lastActivity,
      description: terminal.description
    }));
  }
}

const terminalManager = TerminalManager.getInstance();

export const createTerminalTool: Tool = {
  definition: {
    name: 'create_terminal',
    description: '创建交互式终端会话（适合需要持续交互的命令，如长时间运行的进程、交互式程序等）',
    parameters: {
      type: 'object',
      properties: {
        shell: {
          type: 'string',
          description: 'Shell类型（bash, zsh, sh等）',
          default: 'bash'
        },
        workdir: {
          type: 'string',
          description: '工作目录',
          default: '.'
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '环境变量（可选）'
        },
        initial_command: {
          type: 'string',
          description: '初始命令（可选），创建终端后立即执行的命令'
        }
      },
      required: []
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const shell = parameters.shell || 'bash';
    const workdir = parameters.workdir || '.';
    const env = parameters.env || {};
    const initialCommand = parameters.initial_command;

    return terminalManager.createTerminal(shell, workdir, env, undefined, initialCommand);
  }
};

export const terminalInputTool: Tool = {
  definition: {
    name: 'terminal_input',
    description: '向终端输入命令并等待输出（用于交互式终端会话）',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID'
        },
        input: {
          type: 'string',
          description: '输入的命令或文本'
        },
        wait_timeout: {
          type: 'integer',
          description: '等待输出的超时时间（秒）',
          default: 30,
          minimum: 1,
          maximum: 60
        },
        max_lines: {
          type: 'integer',
          description: '返回的最大行数',
          default: 30,
          minimum: 1,
          maximum: 100
        }
      },
      required: ['terminal_id', 'input']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;
    const input = parameters.input;
    const waitTimeout = parameters.wait_timeout || 30;
    const maxLines = parameters.max_lines || 30;

    if (!terminalId || !input) {
      throw new Error('terminal_id和input参数不能为空');
    }

    return await terminalManager.sendInput(terminalId, input, waitTimeout, maxLines);
  }
};

export const closeTerminalTool: Tool = {
  definition: {
    name: 'close_terminal',
    description: '关闭终端会话',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID'
        }
      },
      required: ['terminal_id']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;
    
    if (!terminalId) {
      throw new Error('terminal_id参数不能为空');
    }

    return terminalManager.closeTerminal(terminalId);
  }
};

export const listTerminalsTool: Tool = {
  definition: {
    name: 'list_terminals',
    description: '列出所有活动的终端会话',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  async execute(): Promise<any> {
    return {
      terminals: terminalManager.listTerminals(),
      count: terminalManager.listTerminals().length
    };
  }
};