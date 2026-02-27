/**
 * 错误处理工具函数 - 提供标准化的错误消息
 */

/**
 * 创建标准化的错误对象
 */
export function createError(
  message: string,
  code?: string,
  details?: Record<string, any>,
  suggestions?: string[]
): Error & { code?: string; details?: Record<string, any>; suggestions?: string[] } {
  const error = new Error(message) as any;
  if (code) error.code = code;
  if (details) error.details = details;
  if (suggestions) error.suggestions = suggestions;
  return error;
}

/**
 * 文件相关错误
 */
export const FileErrors = {
  notFound: (path: string) => createError(
    `文件未找到: ${path}`,
    'FILE_NOT_FOUND',
    { path },
    [
      '检查文件路径是否正确',
      '确认文件是否存在于指定位置',
      '使用list_directory工具查看目录内容'
    ]
  ),
  
  tooLarge: (path: string, actualSize: number, maxSize: number) => createError(
    `文件太大: ${actualSize} bytes (最大支持: ${maxSize} bytes)`,
    'FILE_TOO_LARGE',
    { path, actualSize, maxSize },
    [
      '尝试读取部分文件内容（使用start_line和end_line参数）',
      '检查配置文件中的maxFileSize设置',
      '考虑分割大文件'
    ]
  ),
  
  invalidType: (path: string, allowedExtensions?: string[]) => createError(
    `不支持读取此类文件: ${path}`,
    'INVALID_FILE_TYPE',
    { path, allowedExtensions },
    [
      '确认文件是否为文本文件',
      '检查文件扩展名是否在允许的列表中',
      '使用其他工具处理二进制文件'
    ]
  ),
  
  permissionDenied: (path: string) => createError(
    `权限被拒绝: ${path}`,
    'PERMISSION_DENIED',
    { path },
    [
      '检查文件或目录的权限设置',
      '确认当前用户有访问权限',
      '尝试以管理员身份运行'
    ]
  )
};

/**
 * 路径相关错误
 */
export const PathErrors = {
  invalid: (path: string, reason: string) => createError(
    `无效路径: ${path} (${reason})`,
    'INVALID_PATH',
    { path, reason },
    [
      '检查路径格式是否正确',
      '避免使用特殊字符',
      '使用绝对路径或正确的工作目录相对路径'
    ]
  ),
  
  traversal: (path: string) => createError(
    `检测到路径遍历攻击: ${path}`,
    'PATH_TRAVERSAL',
    { path },
    [
      '不要使用../等路径遍历字符',
      '使用配置管理器验证路径',
      '限制文件访问范围'
    ]
  )
};

/**
 * 参数相关错误
 */
export const ParameterErrors = {
  missing: (paramName: string) => createError(
    `缺少必需参数: ${paramName}`,
    'MISSING_REQUIRED_PARAMETER',
    { parameter: paramName },
    [
      '检查是否提供了所有必需参数',
      '查看工具文档了解参数要求',
      '确保参数名称拼写正确'
    ]
  ),
  
  invalid: (paramName: string, reason: string) => createError(
    `无效参数: ${paramName} (${reason})`,
    'INVALID_PARAMETER',
    { parameter: paramName, reason },
    [
      '检查参数类型和格式',
      '查看工具文档了解参数要求',
      '使用正确的参数值'
    ]
  )
};

/**
 * 命令相关错误
 */
export const CommandErrors = {
  timeout: (command: string, timeout: number) => createError(
    `命令执行超时: ${command} (超时时间: ${timeout}秒)`,
    'COMMAND_TIMEOUT',
    { command, timeout },
    [
      '增加命令超时时间',
      '检查命令是否在正确执行',
      '考虑使用异步执行方式'
    ]
  ),
  
  failed: (command: string, exitCode: number, stderr: string) => createError(
    `命令执行失败: ${command} (退出码: ${exitCode})`,
    'COMMAND_FAILED',
    { command, exitCode, stderr },
    [
      '检查命令语法是否正确',
      '确认命令所需的依赖已安装',
      '查看错误输出获取更多信息'
    ]
  )
};

/**
 * 网络相关错误
 */
export const NetworkErrors = {
  error: (url: string, reason: string) => createError(
    `网络错误: ${url} (${reason})`,
    'NETWORK_ERROR',
    { url, reason },
    [
      '检查网络连接',
      '确认URL是否正确',
      '尝试使用代理或VPN'
    ]
  ),
  
  httpError: (url: string, statusCode: number, statusText: string) => createError(
    `HTTP错误: ${url} (${statusCode} ${statusText})`,
    'HTTP_ERROR',
    { url, statusCode, statusText },
    [
      '检查URL是否正确',
      '确认服务是否可用',
      '查看API文档了解正确的请求方式'
    ]
  )
};

/**
 * 浏览器相关错误
 */
export const BrowserErrors = {
  error: (action: string, reason: string) => createError(
    `浏览器错误: ${action} (${reason})`,
    'BROWSER_ERROR',
    { action, reason },
    [
      '检查浏览器是否已正确安装',
      '确认页面URL是否正确',
      '尝试重新启动浏览器'
    ]
  ),
  
  elementNotFound: (selector: string) => createError(
    `元素未找到: ${selector}`,
    'ELEMENT_NOT_FOUND',
    { selector },
    [
      '检查CSS选择器是否正确',
      '确认页面已加载完成',
      '尝试使用其他选择器或等待元素出现'
    ]
  )
};

/**
 * 通用错误
 */
export const CommonErrors = {
  internal: (message: string, details?: Record<string, any>) => createError(
    `内部错误: ${message}`,
    'INTERNAL_ERROR',
    details,
    [
      '检查系统日志获取更多信息',
      '尝试重新启动服务',
      '联系系统管理员'
    ]
  ),
  
  notImplemented: (feature: string) => createError(
    `功能未实现: ${feature}`,
    'NOT_IMPLEMENTED',
    { feature },
    [
      '检查文档确认功能是否可用',
      '考虑使用替代方案',
      '联系开发团队请求添加该功能'
    ]
  ),
  
  serviceUnavailable: (service: string, reason: string) => createError(
    `服务不可用: ${service} (${reason})`,
    'SERVICE_UNAVAILABLE',
    { service, reason },
    [
      '检查服务是否正在运行',
      '确认网络连接正常',
      '等待服务恢复或联系管理员'
    ]
  )
};

/**
 * 验证参数
 */
export function validateParameters(
  parameters: Record<string, any>,
  requiredParams: string[] = [],
  validationRules: Record<string, (value: any) => boolean> = {}
): void {
  // 检查必需参数
  for (const param of requiredParams) {
    if (parameters[param] === undefined || parameters[param] === null) {
      throw ParameterErrors.missing(param);
    }
  }

  // 应用验证规则
  for (const [param, validator] of Object.entries(validationRules)) {
    if (parameters[param] !== undefined && !validator(parameters[param])) {
      throw ParameterErrors.invalid(param, '验证失败');
    }
  }
}

/**
 * 包装异步函数，提供错误处理
 */
export async function wrapAsync<T>(
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