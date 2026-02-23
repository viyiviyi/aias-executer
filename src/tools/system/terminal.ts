import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { platform } from 'os';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';
import { TerminalInfo } from '../../types';

const configManager = ConfigManager.getInstance();

// 根据操作系统获取默认shell
function getDefaultShell(): string {
  const osPlatform = platform();
  if (osPlatform === 'win32') {
    return 'powershell';
  }
  return 'bash';
}


class TerminalManager {
  private static instance: TerminalManager;
  private terminals: Map<string, TerminalInfo> = new Map();
  private maxTerminals: number;
  private readonly MAX_BUFFER_SIZE = 1000; // 最大缓冲区大小，防止内存溢出

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
    shell: string = getDefaultShell(),
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

      // 初始化输出缓冲区
      const outputBuffer: string[] = [];
      
      // 收集所有输出到缓冲区，并限制缓冲区大小
      const collectOutput = (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n').filter(line => line.trim() !== '');
        
        // 添加新行到缓冲区
        outputBuffer.push(...lines);
        
        // 限制缓冲区大小，移除最旧的行
        if (outputBuffer.length > this.MAX_BUFFER_SIZE) {
          const excess = outputBuffer.length - this.MAX_BUFFER_SIZE;
          outputBuffer.splice(0, excess);
        }
      };

      childProcess.stdout.on('data', collectOutput);
      childProcess.stderr.on('data', collectOutput);

      // 保存终端信息
      this.terminals.set(terminalId, {
        id: terminalId,
        process: childProcess,
        workdir: workdirPath,
        shell,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        description,
        lastReadPosition: 0, // 上次读取的位置，保存在后台
        outputBuffer,
        isReading: false
      });

      // 如果有初始命令，执行它
      if (initialCommand) {
        childProcess.stdin.write(initialCommand + '\n');
      }

      return { terminal_id: terminalId };
    } catch (error: any) {
      throw new Error(`创建终端时出错: ${error.message}`);
    }
  }

  public async readTerminalOutput(
    terminalId: string,
    waitTimeout: number = 30,
    maxLines: number = 100
  ): Promise<any> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    // 检查进程是否还在运行
    if (terminal.process.exitCode !== null) {
      this.cleanupTerminal(terminalId);
      throw new Error('终端进程已结束');
    }

    // 更新活动时间
    terminal.lastActivity = Date.now();

    // 如果正在读取，等待
    if (terminal.isReading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    terminal.isReading = true;

    try {
      return await new Promise((resolve) => {
        const startTime = Date.now();
        let lastOutputTime = Date.now();
        const newLines: string[] = [];
        let timeoutId: NodeJS.Timeout = setTimeout(() => {},0)

        // 检查是否有新输出
        const checkOutput = () => {
          const currentBuffer = terminal.outputBuffer;
          if (currentBuffer.length > terminal.lastReadPosition) {
            // 有新输出
            const newOutput = currentBuffer.slice(terminal.lastReadPosition);
            newLines.push(...newOutput);
            terminal.lastReadPosition = currentBuffer.length;
            lastOutputTime = Date.now();
          }

          // 检查是否达到最大行数
          if (newLines.length >= maxLines) {
            clearTimeout(timeoutId);
            const output = newLines.slice(0, maxLines).join('\n');
            resolve({
              output,
              line_count: Math.min(newLines.length, maxLines),
              truncated: newLines.length > maxLines,
              has_new_output: true
            });
            return;
          }

          // 检查超时条件
          const elapsedTime = Date.now() - startTime;
          const timeSinceLastOutput = Date.now() - lastOutputTime;
          
          if (elapsedTime >= waitTimeout * 1000) {
            // 总超时
            clearTimeout(timeoutId);
            const output = newLines.length > 0 
              ? newLines.join('\n')
              : terminal.outputBuffer.slice(-5).join('\n'); // 返回最后5行
            resolve({
              output,
              line_count: newLines.length || Math.min(5, terminal.outputBuffer.length),
              timeout: true,
              has_new_output: newLines.length > 0
            });
          } else if (timeSinceLastOutput >= 3000 && newLines.length > 0) {
            // 3秒无新输出且有输出
            clearTimeout(timeoutId);
            const output = newLines.join('\n');
            resolve({
              output,
              line_count: newLines.length,
              no_new_output_timeout: true,
              has_new_output: true
            });
          } else if (timeSinceLastOutput >= 3000 && newLines.length === 0) {
            // 3秒无新输出且无输出
            clearTimeout(timeoutId);
            const output = terminal.outputBuffer.slice(-5).join('\n'); // 返回最后5行
            resolve({
              output,
              line_count: Math.min(5, terminal.outputBuffer.length),
              no_new_output: true,
              has_new_output: false
            });
          } else {
            // 继续等待
            setTimeout(checkOutput, 100);
          }
        };

        // 设置总超时
        timeoutId = setTimeout(() => {
          const output = newLines.length > 0 
            ? newLines.join('\n')
            : terminal.outputBuffer.slice(-5).join('\n');
          resolve({
            output,
            line_count: newLines.length || Math.min(5, terminal.outputBuffer.length),
            timeout: true,
            has_new_output: newLines.length > 0
          });
        }, waitTimeout * 1000);

        // 开始检查输出
        checkOutput();
      });
    } finally {
      terminal.isReading = false;
    }
  }

  public async sendInput(
    terminalId: string,
    input: string,
    waitTimeout: number = 30,
    maxLines: number = 100
  ): Promise<any> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    // 检查进程是否还在运行
    if (terminal.process.exitCode !== null) {
      this.cleanupTerminal(terminalId);
      throw new Error('终端进程已结束');
    }

    // 更新活动时间
    terminal.lastActivity = Date.now();

    // 发送输入
    terminal.process.stdin.write(input + '\n');

    // 等待并读取输出
    return await this.readTerminalOutput(terminalId, waitTimeout, maxLines);
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
        description: {
          type: 'string',
          description: '终端描述（可选）'
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
    const shell = parameters.shell || getDefaultShell();
    const workdir = parameters.workdir || '.';
    const env = parameters.env || {};
    const description = parameters.description;
    const initialCommand = parameters.initial_command;

    return terminalManager.createTerminal(shell, workdir, env, description, initialCommand);
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
          default: 100,
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
    const maxLines = parameters.max_lines || 100;

    if (!terminalId || !input) {
      throw new Error('terminal_id和input参数不能为空');
    }

    return await terminalManager.sendInput(terminalId, input, waitTimeout, maxLines);
  }
};

export const readTerminalOutputTool: Tool = {
  definition: {
    name: 'read_terminal_output',
    description: '主动读取终端输出',
    parameters: {
      type: 'object',
      properties: {
        terminal_id: {
          type: 'string',
          description: '终端ID'
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
          default: 100,
          minimum: 1,
          maximum: 100
        }
      },
      required: ['terminal_id']
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const terminalId = parameters.terminal_id;
    const waitTimeout = parameters.wait_timeout || 30;
    const maxLines = parameters.max_lines || 100;

    if (!terminalId) {
      throw new Error('terminal_id参数不能为空');
    }

    return await terminalManager.readTerminalOutput(terminalId, waitTimeout, maxLines);
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