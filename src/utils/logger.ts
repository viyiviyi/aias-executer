/**
 * 日志工具
 * 提供统一的日志输出接口
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix: string = '';

  constructor(prefix?: string) {
    this.prefix = prefix || '';
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 创建带前缀的子日志器
   */
  child(prefix: string): Logger {
    const logger = new Logger(this.prefix ? `${this.prefix}:${prefix}` : prefix);
    logger.setLevel(this.level);
    return logger;
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.output('DEBUG', message, args);
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.output('INFO', message, args);
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      this.output('WARN', message, args);
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.output('ERROR', message, args);
    }
  }

  private output(level: string, message: string, args: unknown[]): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = this.prefix ? ` [${this.prefix}]` : '';
    const role = `[${level}]`;

    // 输出时间和标识（独占一行），内容另起一行
    console.log(`[${timestamp}] ${role}${prefix}`);
    console.log(message);

    // args 中如果是 JSON 字符串或对象，进行美化输出
    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg === 'string') {
          try {
            const parsed = JSON.parse(arg);
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            console.log(arg);
          }
        } else if (typeof arg === 'object' && arg !== null) {
          console.log(JSON.stringify(arg, null, 2));
        } else {
          console.log(arg);
        }
      }
    }

    console.log('');
  }
}

export const logger = new Logger();

export function createLogger(prefix: string): Logger {
  return logger.child(prefix);
}

export function setLogLevel(level: string): void {
  const logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel];
  if (logLevel !== undefined) {
    logger.setLevel(logLevel);
  }
}