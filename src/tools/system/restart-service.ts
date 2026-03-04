import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '@/types';

const execAsync = promisify(exec);

/**
 * 检查项目编译状态
 */
async function checkCompilation(
  timeout: number
): Promise<{ success: boolean; errors: string[]; output: string }> {
  try {
    // 执行编译命令
    const result = await execAsync('npm run build', {
      cwd: process.cwd(),
      env: { ...process.env },
      timeout: timeout * 1000,
      encoding: 'utf-8',
    });

    const output = (result.stdout || '') + (result.stderr || '');
    const exitCode = (result as any).code || 0;

    // 检查编译是否成功
    if (exitCode !== 0) {
      // 编译失败，解析错误
      const errors = parseCompileErrors(output);
      return { success: false, errors, output };
    }

    // 编译成功，但检查是否有警告
    const warnings = extractWarnings(output);
    if (warnings.length > 0) {
      // 编译成功但有警告，在输出中添加警告信息
      const warningHeader = '\n\n=== 编译警告 ===\n';
      const warningText = warnings.join('\n');
      const enhancedOutput = output + warningHeader + warningText;
      return { success: true, errors: [], output: enhancedOutput };
    }

    return { success: true, errors: [], output };
  } catch (error: any) {
    // execAsync抛出的错误（如超时、命令不存在等）
    const output = error.stdout || error.stderr || error.message || '';
    const errors = parseCompileErrors(output);

    // 如果没有解析到具体错误，添加通用错误信息
    if (errors.length === 0 || (errors.length === 1 && errors[0] === '未知编译错误')) {
      errors.unshift(`编译过程异常: ${error.message}`);
    }

    return {
      success: false,
      errors,
      output: error.stack || output,
    };
  }
}

/**
 * 解析编译错误信息
 */
function parseCompileErrors(output: string): string[] {
  const errors: string[] = [];

  // 清理输出，移除多余的空格
  const cleanedOutput = output.trim();
  if (!cleanedOutput) {
    return ['编译输出为空'];
  }

  // 按行分割
  const lines = cleanedOutput.split('\n');

  // 定义TypeScript错误模式
  const tsErrorPattern = /error\s+TS(\d+):\s*(.+)/i;
  const fileLocationPattern = /(\S+\.(?:ts|js|tsx|jsx))\((\d+),(\d+)\)/;

  // 收集所有错误行
  const errorLines: string[] = [];
  let currentError: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 检查是否是错误行开始（包含error但不包含warning）
    if (line.toLowerCase().includes('error') && !line.toLowerCase().includes('warning')) {
      // 如果有收集到前一个错误，先保存
      if (currentError.length > 0) {
        errorLines.push(currentError.join('\n'));
        currentError = [];
      }
      currentError.push(line);
    } else if (currentError.length > 0) {
      // 如果是错误信息的延续（缩进或相关行）
      if (line.startsWith(' ') || line.startsWith('\t') ||
          line.includes('^') || // 错误位置标记
          fileLocationPattern.test(line)) {
        currentError.push(line);
      } else {
        // 错误信息结束
        if (currentError.length > 0) {
          errorLines.push(currentError.join('\n'));
          currentError = [];
        }
      }
    }
  }

  // 处理最后一个错误
  if (currentError.length > 0) {
    errorLines.push(currentError.join('\n'));
  }

  // 处理提取到的错误
  if (errorLines.length > 0) {
    // 限制返回的错误数量
    const maxErrors = 10;
    const limitedErrors = errorLines.slice(0, maxErrors);

    // 格式化错误信息
    for (const errorBlock of limitedErrors) {
      // 尝试提取结构化信息
      const lines = errorBlock.split('\n');
      const firstLine = lines[0];

      // 尝试匹配TypeScript错误代码
      const tsMatch = firstLine.match(tsErrorPattern);
      if (tsMatch) {
        const errorCode = tsMatch[1];
        const errorMessage = tsMatch[2];

        // 查找文件位置
        let fileLocation = '';
        for (const line of lines) {
          const locationMatch = line.match(fileLocationPattern);
          if (locationMatch) {
            const [, file, lineNum, colNum] = locationMatch;
            fileLocation = ` (${file}:${lineNum}:${colNum})`;
            break;
          }
        }

        errors.push(`TS${errorCode}: ${errorMessage}${fileLocation}`);
      } else {
        // 普通错误格式
        errors.push(firstLine);
      }
    }

    // 如果错误太多，添加提示
    if (errorLines.length > maxErrors) {
      errors.push(`... 还有 ${errorLines.length - maxErrors} 个错误未显示`);
    }
  } else if (cleanedOutput.toLowerCase().includes('error')) {
    // 如果包含error关键词但未匹配到格式，返回关键行
    const errorKeywords = ['failed', 'error', '无法', '失败'];
    const relevantLines = lines.filter(line =>
      errorKeywords.some(keyword => line.toLowerCase().includes(keyword))
    ).slice(0, 5);

    if (relevantLines.length > 0) {
      errors.push(...relevantLines);
    } else {
      errors.push('编译失败，无法解析具体错误信息');
    }
  } else if (cleanedOutput) {
    errors.push('编译失败，输出信息：' + cleanedOutput.split('\n')[0]);
  }

  return errors.length > 0 ? errors : ['未知编译错误'];
}

/**
 * 提取编译警告信息
 */
function extractWarnings(output: string): string[] {
  const warnings: string[] = [];

  // 清理输出，移除多余的空格
  const cleanedOutput = output.trim();
  if (!cleanedOutput) {
    return [];
  }

  // 按行分割
  const lines = cleanedOutput.split('\n');

  // 定义警告模式
  const tsWarningPattern = /warning\s+TS(\d+):\s*(.+)/i;
  const fileLocationPattern = /(\S+\.(?:ts|js|tsx|jsx))\((\d+),(\d+)\)/;

  // 收集所有警告行
  const warningLines: string[] = [];
  let currentWarning: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 检查是否是警告行开始（包含warning但不包含error）
    if (line.toLowerCase().includes('warning') && !line.toLowerCase().includes('error')) {
      // 如果有收集到前一个警告，先保存
      if (currentWarning.length > 0) {
        warningLines.push(currentWarning.join('\n'));
        currentWarning = [];
      }
      currentWarning.push(line);
    } else if (currentWarning.length > 0) {
      // 如果是警告信息的延续（缩进或相关行）
      if (line.startsWith(' ') || line.startsWith('\t') ||
          line.includes('^') || // 位置标记
          fileLocationPattern.test(line)) {
        currentWarning.push(line);
      } else {
        // 警告信息结束
        if (currentWarning.length > 0) {
          warningLines.push(currentWarning.join('\n'));
          currentWarning = [];
        }
      }
    }
  }

  // 处理最后一个警告
  if (currentWarning.length > 0) {
    warningLines.push(currentWarning.join('\n'));
  }

  // 处理提取到的警告
  if (warningLines.length > 0) {
    // 限制返回的警告数量
    const maxWarnings = 10;
    const limitedWarnings = warningLines.slice(0, maxWarnings);

    // 格式化警告信息
    for (const warningBlock of limitedWarnings) {
      // 尝试提取结构化信息
      const lines = warningBlock.split('\n');
      const firstLine = lines[0];

      // 尝试匹配TypeScript警告代码
      const tsMatch = firstLine.match(tsWarningPattern);
      if (tsMatch) {
        const warningCode = tsMatch[1];
        const warningMessage = tsMatch[2];

        // 查找文件位置
        let fileLocation = '';
        for (const line of lines) {
          const locationMatch = line.match(fileLocationPattern);
          if (locationMatch) {
            const [, file, lineNum, colNum] = locationMatch;
            fileLocation = ` (${file}:${lineNum}:${colNum})`;
            break;
          }
        }

        warnings.push(`TS${warningCode}: ${warningMessage}${fileLocation}`);
      } else {
        // 普通警告格式
        warnings.push(firstLine);
      }
    }

    // 如果警告太多，添加提示
    if (warningLines.length > maxWarnings) {
      warnings.push(`... 还有 ${warningLines.length - maxWarnings} 个警告未显示`);
    }
  }

  return warnings;
}

/**
 * 检测当前运行环境
 */
function detectEnvironment(): string {
  // 按优先级检测环境

  // 1. 检查是否由PM2管理（最高优先级）
  if (isManagedByPM2()) {
    return 'pm2';
  }

  // 2. 检查是否由ts-node-dev管理
  if (isManagedByTsNodeDev()) {
    return 'development';
  }

  // 3. 检查是否在Docker容器中
  if (fs.existsSync('/.dockerenv')) {
    // 检查是否由其他进程管理器管理（但PM2已检查过）
    return 'docker';
  }

  // 4. 检查是否在Windows服务中
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

  // 5. 检查是否在systemd服务中
  if (process.platform === 'linux' || process.platform === 'darwin') {
    // 检查是否由systemd管理
    if (process.env.INVOCATION_ID) {
      return 'systemd';
    }

    // 检查是否有.service文件
    try {
      const serviceFiles = fs.readdirSync('/etc/systemd/system').filter((f) => f.includes('aias'));
      if (serviceFiles.length > 0) {
        return 'systemd';
      }
    } catch {
      // 忽略错误
    }
  }

  // 6. 默认开发环境
  return 'development';
}

/**
 * 检测是否由ts-node-dev管理
 */
function isManagedByTsNodeDev(): boolean {
  // 检查进程参数是否包含ts-node-dev
  const processArgs = process.argv.join(' ');
  if (processArgs.includes('ts-node-dev')) {
    return true;
  }

  // 检查父进程（在Linux/macOS上）
  if (process.platform === 'linux' || process.platform === 'darwin') {
    try {
      const ppid = process.ppid;
      // 读取父进程的命令行
      const fs = require('fs');
      const cmdlinePath = `/proc/${ppid}/cmdline`;
      if (fs.existsSync(cmdlinePath)) {
        const cmdline = fs.readFileSync(cmdlinePath, 'utf8');
        return cmdline.includes('ts-node-dev');
      }
    } catch {
      // 忽略错误
    }
  }

  // 检查环境变量（ts-node-dev可能会设置）
  if (process.env.TS_NODE_DEV) {
    return true;
  }

  return false;
}

/**
 * 检测是否由PM2管理
 */
function isManagedByPM2(): boolean {
  // 检查环境变量（PM2设置的环境变量）
  if (process.env.PM2_HOME || process.env.PM2_PROGRAMMATIC) {
    return true;
  }

  // 检查进程名称或参数
  const processArgs = process.argv.join(' ');
  if (processArgs.includes('pm2') || process.title?.includes('pm2')) {
    return true;
  }

  // 检查NODE_APP_INSTANCE环境变量（PM2集群模式）
  if (process.env.NODE_APP_INSTANCE !== undefined) {
    return true;
  }

  // 检查父进程（在Linux/macOS上）
  if (process.platform === 'linux' || process.platform === 'darwin') {
    try {
      const ppid = process.ppid;
      const fs = require('fs');
      const cmdlinePath = `/proc/${ppid}/cmdline`;
      if (fs.existsSync(cmdlinePath)) {
        const cmdline = fs.readFileSync(cmdlinePath, 'utf8');
        return cmdline.includes('pm2');
      }
    } catch {
      // 忽略错误
    }
  }

  // 尝试加载pm2模块来验证
  try {
    require('pm2');
    return true;
  } catch {
    // pm2模块未安装或不可用
  }

  return false;
}

/**
 * 获取重启方法描述
 */
function getRestartMethod(): string {
  const env = detectEnvironment();

  switch (env) {
    case 'pm2':
      return 'PM2进程管理器重启（使用PM2 API优雅重启）';
    case 'docker':
      return 'Docker容器重启（依赖Docker restart策略）';
    case 'windows-service':
      return 'Windows服务重启（依赖WinSW自动重启）';
    case 'systemd':
      return 'systemd服务重启（依赖systemd Restart配置）';
    case 'development':
      if (isManagedByTsNodeDev()) {
        return '开发模式重启（ts-node-dev将自动重启进程）';
      }
      return '开发模式重启（进程退出后需手动重启）';
    default:
      return '进程优雅退出';
  }
}

/**
 * 使用PM2 API重启当前应用
 */
async function restartWithPM2(): Promise<boolean> {
  try {
    console.log('[RestartService] 尝试通过PM2 API重启应用...');

    // 动态加载pm2模块
    const pm2 = require('pm2');

    return new Promise((resolve, reject) => {
      pm2.connect((err: any) => {
        if (err) {
          console.error('[RestartService] PM2连接失败:', err.message);
          reject(err);
          return;
        }

        // 重启当前应用（根据进程名或ID）
        const processName = 'aias-executor'; // 从ecosystem.config.js获取
        pm2.restart(processName, (restartErr: any) => {
          pm2.disconnect();

          if (restartErr) {
            console.error('[RestartService] PM2重启失败:', restartErr.message);
            reject(restartErr);
          } else {
            console.log('[RestartService] PM2重启命令已发送');
            resolve(true);
          }
        });
      });
    });
  } catch (error: any) {
    console.error('[RestartService] PM2重启异常:', error.message);
    return false;
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
    restartMethod: getRestartMethod(),
  };

  try {
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch {
    // 忽略日志写入错误
  }

  // 根据环境执行不同的退出策略
  switch (env) {
    case 'pm2':
      // 使用PM2 API优雅重启
      console.log('[RestartService] 通过PM2 API重启应用...');
      restartWithPM2().then(success => {
        if (!success) {
          console.log('[RestartService] PM2重启失败，回退到进程退出');
          process.exit(1);
        }
        // 如果成功，PM2会处理重启，当前进程会继续运行直到被PM2停止
      }).catch(error => {
        console.error('[RestartService] PM2重启异常:', error.message);
        process.exit(1);
      });
      // 注意：不要在这里调用break，因为我们需要等待异步操作
      return;

    case 'docker':
    case 'windows-service':
    case 'systemd':
      // 这些环境有外部进程管理器，直接退出即可
      console.log('[RestartService] 退出进程，等待外部管理器重启');
      process.exit(1);
      break;

    case 'development':
      // 开发环境：尝试使用nodemon/ts-node-dev的热重载
      if (isManagedByTsNodeDev()) {
        console.log('[RestartService] 开发环境退出，ts-node-dev将自动重启进程');
        console.log('[RestartService] 如果未自动重启，请确保ts-node-dev使用--respawn参数启动');
      } else {
        console.log('[RestartService] 开发环境退出，可能需要手动重启');
      }
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
    name: 'service_restart',
    groupName: '系统服务',
    description: '编译并重启当前服务，当维护服务自身功能后调用安全重启',
    parameters: {
      type: 'object',
      properties: {
        checkOnly: {
          type: 'boolean',
          description: '仅检查编译，不执行重启',
          default: false,
        },
        timeout: {
          type: 'integer',
          description: '编译检查超时时间（秒）',
          default: 120,
          minimum: 30,
          maximum: 300,
        },
        delay: {
          type: 'integer',
          description: '重启延迟时间（毫秒，给响应返回留出时间，外部重启会再延迟12秒）',
          default: 2000,
          minimum: 500,
          maximum: 10000,
        },
      },
      required: [],
    },
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const { checkOnly = false, timeout = 120, delay = 2000 } = parameters;

    try {
      // 1. 编译检查（除非force=true）
      let compileResult: { success: boolean; errors: string[]; output: string } = {
        success: true,
        errors: [],
        output: '',
      };
      compileResult = await checkCompilation(timeout);
      if (!compileResult.success) {
        return {
          success: false,
          error: '编译检查失败',
          details: compileResult.errors,
          output: compileResult.output,
          suggestion: '修复编译错误后重试',
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
          restartMethod: getRestartMethod(),
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
        note: '重启过程中服务会有短暂中断，外部进程管理器将自动重启服务',
      };
    } catch (error: any) {
      return {
        success: false,
        error: '重启服务执行失败',
        details: error.message,
        stack: error.stack,
        suggestion: '请检查服务配置和权限',
      };
    }
  },
};
