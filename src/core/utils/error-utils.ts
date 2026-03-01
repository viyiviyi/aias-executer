/**
 * 错误处理工具函数
 */

export class FileErrors {
  static notFound(filePath: string): Error {
    return new Error(`文件不存在: ${filePath}`);
  }

  static tooLarge(filePath: string, actualSize: number, maxSize: number): Error {
    return new Error(
      `文件过大: ${filePath} (${actualSize} bytes > ${maxSize} bytes)`
    );
  }

  static invalidType(
    filePath: string,
    allowedExtensions: string[]
  ): Error {
    const ext = filePath.includes('.')
      ? filePath.substring(filePath.lastIndexOf('.'))
      : '无扩展名';
    return new Error(
      `文件类型不支持: ${filePath} (扩展名: ${ext})。允许的扩展名: ${allowedExtensions.join(', ')}`
    );
  }

  static permissionDenied(filePath: string): Error {
    return new Error(`权限不足: ${filePath}`);
  }

  static readError(filePath: string, error: any): Error {
    return new Error(`读取文件失败: ${filePath} - ${error.message || error}`);
  }

  static writeError(filePath: string, error: any): Error {
    return new Error(`写入文件失败: ${filePath} - ${error.message || error}`);
  }

  static deleteError(filePath: string, error: any): Error {
    return new Error(`删除文件失败: ${filePath} - ${error.message || error}`);
  }
}

export class ParameterErrors {
  static missing(parameterName: string): Error {
    return new Error(`缺少必要参数: ${parameterName}`);
  }

  static invalid(parameterName: string, reason: string): Error {
    return new Error(`参数无效: ${parameterName} - ${reason}`);
  }

  static outOfRange(
    parameterName: string,
    value: any,
    min?: number,
    max?: number
  ): Error {
    let message = `参数超出范围: ${parameterName}=${value}`;
    if (min !== undefined && max !== undefined) {
      message += ` (范围: ${min} - ${max})`;
    } else if (min !== undefined) {
      message += ` (最小值: ${min})`;
    } else if (max !== undefined) {
      message += ` (最大值: ${max})`;
    }
    return new Error(message);
  }

  static typeMismatch(parameterName: string, expectedType: string): Error {
    return new Error(
      `参数类型不匹配: ${parameterName} 应为 ${expectedType} 类型`
    );
  }
}

export class CommandErrors {
  static notAllowed(command: string): Error {
    return new Error(`命令不被允许: ${command}`);
  }

  static timeout(command: string, timeout: number): Error {
    return new Error(`命令执行超时: ${command} (${timeout}秒)`);
  }

  static executionError(command: string, error: any): Error {
    return new Error(`命令执行失败: ${command} - ${error.message || error}`);
  }
}

export class BrowserErrors {
  static sessionNotFound(sessionId: string): Error {
    return new Error(`浏览器会话不存在: ${sessionId}`);
  }

  static pageNotFound(sessionId: string): Error {
    return new Error(`页面不存在: ${sessionId}`);
  }

  static navigationError(url: string, error: any): Error {
    return new Error(`导航失败: ${url} - ${error.message || error}`);
  }

  static elementNotFound(selector: string): Error {
    return new Error(`元素未找到: ${selector}`);
  }
}

export class TerminalErrors {
  static notFound(terminalId: string): Error {
    return new Error(`终端不存在: ${terminalId}`);
  }

  static maxTerminalsReached(maxTerminals: number): Error {
    return new Error(`已达到最大终端数限制: ${maxTerminals}`);
  }

  static alreadyClosed(terminalId: string): Error {
    return new Error(`终端已关闭: ${terminalId}`);
  }
}

/**
 * 参数验证函数
 */
export function validateParameters(
  parameters: Record<string, any>,
  requiredParams: string[],
  validators?: Record<string, (value: any) => boolean>
): void {
  // 检查必要参数
  for (const param of requiredParams) {
    if (parameters[param] === undefined || parameters[param] === null) {
      throw ParameterErrors.missing(param);
    }
  }

  // 执行自定义验证
  if (validators) {
    for (const [param, validator] of Object.entries(validators)) {
      if (parameters[param] !== undefined && !validator(parameters[param])) {
        throw ParameterErrors.invalid(param, '验证失败');
      }
    }
  }
}

/**
 * 安全执行函数，捕获并包装错误
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => Error
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (errorHandler) {
      throw errorHandler(error);
    }
    throw error;
  }
}