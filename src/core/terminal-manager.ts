import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { platform } from 'os';
import { TerminalInfo } from '@/types';
import { ConfigManager } from './config';
import type { IPty } from 'node-pty';

const configManager = ConfigManager.getInstance();

// 根据操作系统获取默认shell
function getDefaultShell(): string {
  const osPlatform = platform();
  if (osPlatform === 'win32') {
    return 'powershell';
  }
  return 'bash';
}

// 获取终端配置
function getTerminalConfig() {
  return configManager.getTerminalConfig();
}

// 检查是否使用 pty
function shouldUsePty(): boolean {
  return getTerminalConfig().usePty;
}

// 清理终端输出中的控制字符
function cleanTerminalOutput(data: string): string {
  // 移除 ANSI 转义序列
  return data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

// 分割终端输出为行
function splitTerminalOutput(data: string): string[] {
  const cleaned = cleanTerminalOutput(data);
  return cleaned.split('\n').filter(line => line.trim() !== '');
}

export class TerminalManager {
  private static instance: TerminalManager;
  private terminals: Map<string, TerminalInfo> = new Map();
  private maxTerminals: number;
  private terminalConfig: ReturnType<typeof getTerminalConfig>;

  private constructor() {
    const config = configManager.getConfig();
    this.maxTerminals = config.maxTerminals;
    this.terminalConfig = getTerminalConfig();
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
    initialCommand?: string,
    cols?: number,
    rows?: number,
    encoding?: string
  ): { terminal_id: string } {
    // 检查终端数量限制
    if (this.terminals.size >= this.maxTerminals) {
      throw new Error(`已达到最大终端数限制: ${this.maxTerminals}`);
    }

    // 检查shell是否存在（宽松检查，因为某些shell可能无法通过where/which找到）
    try {
      if (platform() === 'win32') {
        // Windows: 尝试使用where命令检查，但忽略错误
        try {
          execSync(`where ${shell}`, { stdio: 'ignore' });
        } catch (error) {
          // 忽略错误，继续尝试
          console.warn(`警告: 无法找到shell: ${shell}, 将继续尝试创建终端`);
        }
      } else {
        // Unix-like: 使用which命令检查
        try {
          execSync(`which ${shell}`, { stdio: 'ignore' });
        } catch (error) {
          console.warn(`警告: 无法找到shell: ${shell}, 将继续尝试创建终端`);
        }
      }
    } catch (error: any) {
      // 忽略检查错误，让 pty.spawn 自己处理
      console.warn(`Shell检查失败: ${error.message}`);
    }

    // 验证工作目录
    const workdirPath = configManager.validatePath(workdir, true);

    // 生成唯一ID
    const terminalId = uuidv4();

    try {
      // 准备环境变量
      const fullEnv = { ...process.env, ...env };

      // 终端配置
      const terminalCols = cols || this.terminalConfig.defaultCols;
      const terminalRows = rows || this.terminalConfig.defaultRows;
      const terminalEncoding = encoding || this.terminalConfig.encoding;

      let terminalProcess: any;
      const outputBuffer: string[] = [];
      let rawOutputBuffer = '';

      if (shouldUsePty()) {
        // 使用 node-pty 创建伪终端
        const ptyOptions: any = {
          name: this.terminalConfig.terminalType,
          cols: terminalCols,
          rows: terminalRows,
          cwd: workdirPath,
          env: fullEnv,
        };

        // Windows 上不支持 encoding 参数
        if (platform() !== 'win32') {
          ptyOptions.encoding = terminalEncoding;
        }

        const ptyProcess = pty.spawn(shell, [], ptyOptions);

        // 收集输出到缓冲区
        ptyProcess.onData((data: string) => {
          // 保存原始数据（包含控制字符）
          rawOutputBuffer += data;

          // 更新终端对象中的 rawOutputBuffer
          const terminal = this.terminals.get(terminalId);
          if (terminal) {
            terminal.rawOutputBuffer = rawOutputBuffer;
          }

          // 清理并分割为文本行
          const lines = splitTerminalOutput(data);
          if (lines.length > 0) {
            outputBuffer.push(...lines);

            // 限制缓冲区大小
            if (outputBuffer.length > this.terminalConfig.maxBufferSize) {
              const excess = outputBuffer.length - this.terminalConfig.maxBufferSize;
              outputBuffer.splice(0, excess);
            }
          }
        });

        // 处理进程退出
        ptyProcess.onExit(() => {
          // 进程退出时清理终端
          setTimeout(() => {
            this.cleanupTerminal(terminalId);
          }, 1000);
        });

        terminalProcess = ptyProcess;
      } else {
        // 使用传统子进程（向后兼容）
        const childProcess = spawn(shell, [], {
          cwd: workdirPath,
          env: fullEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        // 收集所有输出到缓冲区
        const collectOutput = (data: Buffer) => {
          const output = data.toString();
          const lines = output.split('\n').filter((line) => line.trim() !== '');

          // 添加新行到缓冲区
          outputBuffer.push(...lines);

          // 限制缓冲区大小
          if (outputBuffer.length > this.terminalConfig.maxBufferSize) {
            const excess = outputBuffer.length - this.terminalConfig.maxBufferSize;
            outputBuffer.splice(0, excess);
          }
        };

        childProcess.stdout.on('data', collectOutput);
        childProcess.stderr.on('data', collectOutput);

        terminalProcess = childProcess;
      }

      // 保存终端信息
      this.terminals.set(terminalId, {
        id: terminalId,
        process: terminalProcess,
        workdir: workdirPath,
        shell,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        description,
        lastReadPosition: 0,
        outputBuffer,
        isReading: false,
        cols: terminalCols,
        rows: terminalRows,
        encoding: terminalEncoding,
        rawOutputBuffer: shouldUsePty() ? rawOutputBuffer : undefined,
      } as TerminalInfo);

      // 如果有初始命令，执行它
      if (initialCommand) {
        this.sendInputToProcess(terminalProcess, initialCommand);
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
    if (!this.isProcessAlive(terminal.process)) {
      this.cleanupTerminal(terminalId);
      throw new Error('终端进程已结束');
    }

    // 更新活动时间
    terminal.lastActivity = Date.now();

    // 如果正在读取，等待
    if (terminal.isReading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    terminal.isReading = true;

    try {
      return await new Promise((resolve) => {
        const startTime = Date.now();
        let lastOutputTime = Date.now();
        const newLines: string[] = [];
        let timeoutId: NodeJS.Timeout = setTimeout(() => {}, 0);

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
              has_new_output: true,
            });
            return;
          }

          // 检查超时条件
          const elapsedTime = Date.now() - startTime;
          const timeSinceLastOutput = Date.now() - lastOutputTime;

          if (elapsedTime >= waitTimeout * 1000) {
            // 总超时
            clearTimeout(timeoutId);
            const output =
              newLines.length > 0
                ? newLines.join('\n')
                : terminal.outputBuffer.slice(-5).join('\n'); // 返回最后5行
            resolve({
              output,
              line_count: newLines.length || Math.min(5, terminal.outputBuffer.length),
              timeout: true,
              has_new_output: newLines.length > 0,
            });
          } else if (timeSinceLastOutput >= 3000 && newLines.length > 0) {
            // 3秒无新输出且有输出
            clearTimeout(timeoutId);
            const output = newLines.join('\n');
            resolve({
              output,
              line_count: newLines.length,
              no_new_output_timeout: true,
              has_new_output: true,
            });
          } else if (timeSinceLastOutput >= 3000 && newLines.length === 0) {
            // 3秒无新输出且无输出
            clearTimeout(timeoutId);
            const output = terminal.outputBuffer.slice(-5).join('\n'); // 返回最后5行
            resolve({
              output,
              line_count: Math.min(5, terminal.outputBuffer.length),
              no_new_output: true,
              has_new_output: false,
            });
          } else {
            // 继续等待
            setTimeout(checkOutput, 100);
          }
        };

        // 设置总超时
        timeoutId = setTimeout(() => {
          const output =
            newLines.length > 0 ? newLines.join('\n') : terminal.outputBuffer.slice(-5).join('\n');
          resolve({
            output,
            line_count: newLines.length || Math.min(5, terminal.outputBuffer.length),
            timeout: true,
            has_new_output: newLines.length > 0,
          });
        }, waitTimeout * 1000);

        // 开始检查输出
        checkOutput();
      });
    } finally {
      terminal.isReading = false;
    }
  }

  // 发送输入到进程（支持 pty 和传统进程）
  private sendInputToProcess(process: any, input: string): void {
    if (shouldUsePty() && typeof (process as IPty).write === 'function') {
      // pty 进程
      (process as IPty).write(input + '\n');
    } else if (process.stdin && typeof process.stdin.write === 'function') {
      // 传统子进程
      process.stdin.write(input + '\n');
    } else {
      throw new Error('不支持的进程类型');
    }
  }

  // 检查进程是否存活
  private isProcessAlive(process: any): boolean {
    if (shouldUsePty()) {
      // pty 进程：通过监听器检查是否已退出
      // 由于 node-pty 没有公开的 exited 属性，我们假设进程是存活的
      // 除非我们收到了 onExit 事件（这会在 cleanupTerminal 中处理）
      return true;
    } else {
      // 传统子进程：检查 exitCode
      return process.exitCode === null;
    }
  }

  // 杀死进程
  private killProcess(process: any): void {
    if (shouldUsePty() && typeof (process as IPty).kill === 'function') {
      (process as IPty).kill();
    } else if (typeof process.kill === 'function') {
      process.kill();
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
    if (!this.isProcessAlive(terminal.process)) {
      this.cleanupTerminal(terminalId);
      throw new Error('终端进程已结束');
    }

    // 更新活动时间
    terminal.lastActivity = Date.now();

    // 发送输入
    this.sendInputToProcess(terminal.process, input);

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
        this.killProcess(terminal.process);
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
    cols?: number;
    rows?: number;
    encoding?: string;
    use_pty?: boolean;
  }> {
    return Array.from(this.terminals.values()).map((terminal) => ({
      id: terminal.id,
      workdir: terminal.workdir,
      shell: terminal.shell,
      created_at: terminal.createdAt,
      last_activity: terminal.lastActivity,
      description: terminal.description,
      cols: terminal.cols,
      rows: terminal.rows,
      encoding: terminal.encoding,
      use_pty: shouldUsePty(),
    }));
  }

  /**
   * 调整终端尺寸
   */
  public resizeTerminal(terminalId: string, cols: number, rows: number): { success: boolean } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    if (!shouldUsePty()) {
      throw new Error('只有使用 pty 的终端支持调整尺寸');
    }

    const ptyProcess = terminal.process as IPty;
    if (typeof ptyProcess.resize === 'function') {
      ptyProcess.resize(cols, rows);
      terminal.cols = cols;
      terminal.rows = rows;
      return { success: true };
    }

    throw new Error('终端不支持调整尺寸');
  }

  /**
   * 发送信号到终端
   */
  public sendSignal(terminalId: string, signal: string): { success: boolean } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    if (!shouldUsePty()) {
      throw new Error('只有使用 pty 的终端支持发送信号');
    }

    const ptyProcess = terminal.process as IPty;

    // 映射信号到控制字符
    const signalMap: Record<string, string> = {
      'SIGINT': '\x03',  // Ctrl+C
      'SIGTSTP': '\x1A', // Ctrl+Z
      'SIGQUIT': '\x1C', // Ctrl+\
      'SIGKILL': '\x1B', // Esc
    };

    const controlChar = signalMap[signal];
    if (controlChar) {
      ptyProcess.write(controlChar);
      return { success: true };
    }

    throw new Error(`不支持的信号: ${signal}`);
  }

  /**
   * 获取终端原始输出（包含控制字符）
   */
  public getRawTerminalOutput(terminalId: string): { output: string } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`终端不存在: ${terminalId}`);
    }

    if (!shouldUsePty()) {
      throw new Error('只有使用 pty 的终端支持获取原始输出');
    }

    return { output: terminal.rawOutputBuffer || '' };
  }
}