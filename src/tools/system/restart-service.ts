import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '@/types';

const execAsync = promisify(exec);


/**
 * 检查项目编译状态
 */
async function checkCompilation(timeout: number): Promise<{ success: boolean; errors: string[]; output: string }> {
  try {
    // 执行编译命令
    const result = await execAsync('yarn build', {
      cwd: process.cwd(),
      env: {},
      timeout: timeout,
      encoding: 'utf-8',
    });

    const output = (result.stdout || '') + (result.stderr || '');

    if (result.stderr) {
      // 解析编译错误
      const errors = parseCompileErrors(output);
      return { success: false, errors, output };
    }

    return { success: true, errors: [], output };

  } catch (error: any) {
    return {
      success: false,
      errors: [`编译检查异常: ${error.message}`],
      output: error.stack || ''
    };
  }
}

/**
 * 解析编译错误信息
 */
function parseCompileErrors(output: string): string[] {
  const errors: string[] = [];

  // 匹配TypeScript错误格式
  const tsErrorRegex = /error TS\d+: .*?(?=\n|$)/g;
  const matches = output.match(tsErrorRegex);

  if (matches) {
    errors.push(...matches.slice(0, 10)); // 最多返回10个错误
  } else if (output.includes('error') || output.includes('Error')) {
    // 如果没有匹配到标准格式，提取包含error的行
    const lines = output.split('\n');
    const errorLines = lines.filter(line =>
      line.toLowerCase().includes('error') &&
      !line.toLowerCase().includes('warning')
    ).slice(0, 10);
    errors.push(...errorLines);
  } else if (output.trim()) {
    errors.push('编译失败，但无法解析具体错误信息');
  }

  return errors.length > 0 ? errors : ['未知编译错误'];
}

/**
 * 检测当前运行环境
 */
function detectEnvironment(): string {
  // 检查是否在Docker中
  if (fs.existsSync('/.dockerenv')) {
    return 'docker';
  }

  // 检查是否在Windows服务中
  if (process.platform === 'win32') {
    try {
      const winswPath = path.join(process.cwd(), 'win-server', 'aias-executer.exe');
      if (fs.existsSync(winswPath)) {
        return 'windows-service';
      }
    } catch {
      // 忽略错误
    }
  }

  // 检查是否在systemd服务中
  if (process.platform === 'linux' || process.platform === 'darwin') {
    // 检查是否由systemd管理
    if (process.env.INVOCATION_ID) {
      return 'systemd';
    }

    // 检查是否有.service文件
    try {
      const serviceFiles = fs.readdirSync('/etc/systemd/system').filter(f => f.includes('aias'));
      if (serviceFiles.length > 0) {
        return 'systemd';
      }
    } catch {
      // 忽略错误
    }
  }

  // 默认开发环境
  return 'development';
}

/**
 * 获取重启方法描述
 */
function getRestartMethod(): string {
  const env = detectEnvironment();

  switch (env) {
    case 'docker':
      return 'Docker容器重启（依赖Docker restart策略）';
    case 'windows-service':
      return 'Windows服务重启（依赖WinSW自动重启）';
    case 'systemd':
      return 'systemd服务重启（依赖systemd Restart配置）';
    case 'development':
      return '开发模式重启（进程退出后需手动重启）';
    default:
      return '进程优雅退出';
  }
}

/**
 * 执行优雅退出
 */
function performGracefulExit(): void {
  const env = detectEnvironment();

  console.log(`[RestartService] 执行优雅退出，环境: ${env}`);

  // 记录重启日志
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, 'restart.log');
  const logEntry = {
    timestamp: new Date().toISOString(),
    environment: env,
    pid: process.pid,
    restartMethod: getRestartMethod()
  };

  try {
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch {
    // 忽略日志写入错误
  }

  // 根据环境执行不同的退出策略
  switch (env) {
    case 'docker':
    case 'windows-service':
    case 'systemd':
      // 这些环境有外部进程管理器，直接退出即可
      console.log('[RestartService] 退出进程，等待外部管理器重启');
      process.exit(1);
      break;

    case 'development':
      // 开发环境：尝试使用nodemon/ts-node-dev的热重载
      console.log('[RestartService] 开发环境退出，可能需要手动重启');
      process.exit(1);
      break;

    default:
      // 默认优雅退出
      console.log('[RestartService] 执行默认优雅退出');
      process.exit(1);
  }
}

export const restartServiceTool: Tool = {
  definition: {
    name: 'restart_service',
    description: '编译并安全重启当前服务（通过退出让外部进程管理器重启）',
    parameters: {
      type: 'object',
      properties: {
        checkOnly: {
          type: 'boolean',
          description: '仅检查编译，不执行重启',
          default: false
        },
        timeout: {
          type: 'integer',
          description: '编译检查超时时间（秒）',
          default: 120,
          minimum: 30,
          maximum: 300
        },
        delay: {
          type: 'integer',
          description: '重启延迟时间（毫秒，给响应返回留出时间，外部重启会再延迟12秒）',
          default: 2000,
          minimum: 500,
          maximum: 10000
        }
      },
      required: []
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const { checkOnly = false, timeout = 120, delay = 2000 } = parameters;

    try {
      // 1. 编译检查（除非force=true）
      let compileResult: { success: boolean; errors: string[]; output: string } = { success: true, errors: [], output: '' };
      compileResult = await checkCompilation(timeout);
      if (!compileResult.success) {
        return {
          success: false,
          error: '编译检查失败',
          details: compileResult.errors,
          output: compileResult.output,
          suggestion: '修复编译错误后重试，或使用force参数跳过检查'
        };
      }
      // 2. 如果仅检查，返回结果
      if (checkOnly) {
        return {
          success: true,
          compileStatus: compileResult.success ? 'success' : 'skipped',
          restartReady: true,
          message: '编译检查通过，可以安全重启',
          environment: detectEnvironment(),
          restartMethod: getRestartMethod()
        };
      }

      // 3. 准备重启 - 返回响应后延迟执行退出
      const environment = detectEnvironment();
      const restartMethod = getRestartMethod();

      // 设置延迟退出
      setTimeout(() => {
        console.log(`[RestartService] 开始重启服务，环境: ${environment}, 方法: ${restartMethod}`);
        performGracefulExit();
      }, delay);

      return {
        success: true,
        message: '重启已触发，服务将在几秒后重启',
        compileStatus: compileResult.success ? 'success' : 'skipped',
        environment: environment,
        restartMethod: restartMethod,
        restartInitiated: true,
        delay: delay,
        note: '重启过程中服务会有短暂中断，外部进程管理器将自动重启服务'
      };

    } catch (error: any) {
      return {
        success: false,
        error: '重启服务执行失败',
        details: error.message,
        stack: error.stack,
        suggestion: '请检查服务配置和权限'
      };
    }
  }
};