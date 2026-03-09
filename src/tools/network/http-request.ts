import { Tool } from '@/types/tools/Tool';
import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { ConfigManager } from '../../core/config';

export const httpRequestTool: Tool = {
  definition: {
    name: 'utils_http_request',
    groupName: '基础工具',
    description: '直接发起http请求',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '请求URL'
        },
        method: {
          type: 'string',
          description: 'HTTP方法',
          default: 'GET',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '请求头（可选）'
        },
        params: {
          type: 'object',
          additionalProperties: { type: ['string', 'number', 'boolean'] },
          description: 'URL查询参数（可选）'
        },
        data: {
          type: ['string', 'object'],
          description: '请求体数据（表单或JSON，可选）'
        },
        json_data: {
          type: 'object',
          description: 'JSON请求体数据（可选）'
        },
        download_info: {
          type: 'object',
          description: '文件下载信息（可选），启用后不再返回响应结果，而是下载文件',
          properties: {
            filename: {
              type: 'string',
              description: '文件名（可选），如果不指定则从响应头或URL中提取'
            },
            save_path: {
              type: 'string',
              description: '存放位置（相对于工作目录），如果不指定则保存到downloads目录'
            }
          }
        },
        timeout: {
          type: 'integer',
          description: '请求超时时间（秒）',
          default: 30,
          minimum: 1,
          maximum: 120
        }
      },
      required: ['url']
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（发送HTTP请求）
      destructiveHint: false,   // 非破坏性操作（只发送请求）
      idempotentHint: false,    // 非幂等操作（某些HTTP方法非幂等）
      openWorldHint: true,      // 开放世界操作（访问外部服务）
      category: 'network',      // 网络操作类别
      version: '1.0.0',        // 工具版本
      tags: ['network', 'http', 'request', 'api', 'rest'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '请求是否成功' },
        status: { type: 'integer', description: 'HTTP状态码' },
        statusText: { type: 'string', description: 'HTTP状态文本' },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: '响应头'
        },
        download_result: {
          type: 'object',
          description: '下载结果（当启用下载时返回）',
          properties: {
            success: { type: 'boolean', description: '下载是否成功' },
            file_path: { type: 'string', description: '文件保存路径' },
            file_size: { type: 'integer', description: '文件大小（字节）' },
            filename: { type: 'string', description: '文件名' },
            error: { type: 'string', description: '错误信息（如果下载失败）' }
          }
        },
        data: { type: 'string', description: '响应数据（文本格式）' },
      },
      required: ['success', 'status', 'statusText', 'headers', 'data',]
    },

    // 使用指南
    guidelines: [
      '支持文件下载功能，通过download_info参数启用',
      '启用下载时，不再返回响应结果，而是下载文件并返回下载结果',
      '可以指定文件名和保存路径，不指定则自动处理',
      '支持所有HTTP方法：GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS',
      '可以设置请求头、查询参数、请求体数据',
      '支持JSON数据和表单数据',
      '可用于调用公共接口或用于测试api',
      '默认超时30秒，可以自定义',
      '返回详细的请求和响应信息'
    ],

    result_use_type: 'once'
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const url = parameters.url;
    const method = parameters.method || 'GET';
    const headers = parameters.headers || {};
    const downloadInfo = parameters.download_info;
    const params = parameters.params;
    const data = parameters.data;
    const jsonData = parameters.json_data;
    const timeout = parameters.timeout || 30;

    if (!url) {
      throw new Error('url参数不能为空');
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers,
      params,
      timeout: timeout * 1000,
      responseType: downloadInfo ? 'stream' : 'text', // 如果启用下载则使用流式响应，否则使用文本响应
      validateStatus: () => true // 接受所有状态码
    };
    if (jsonData) {
      config.data = jsonData;
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json'
      };
    } else if (data) {
      config.data = data;
    }
    try {

      const response = await axios(config);

      // 如果启用了下载功能
      if (downloadInfo) {
        return await handleFileDownload(response, downloadInfo, url);
      }

      // 否则，处理普通响应
      return handleNormalResponse(response);
    } catch (error: any) {
      if (error.response) {
        // 服务器响应了错误状态码
        return {
          status: error.response.status,
          status_text: error.response.statusText,
          response_headers: error.response.headers,
          data: error.response.data,
          success: false,
          error: `HTTP错误: ${error.response.status}`
        };
      } else if (error.request) {
        // 请求已发送但没有收到响应
        throw new Error(`请求失败: ${error.message}`);
      } else {
        // 请求配置错误
        throw new Error(`请求配置错误: ${error.message}`);
      }
    }
  }
};

// 处理文件下载
async function handleFileDownload(response: any, downloadInfo: any, url: string): Promise<any> {
  try {
    const configManager = ConfigManager.getInstance();
    const workspaceDir = configManager.getConfig().workspaceDir || './workspace';
    
    // 确定保存目录
    let saveDir = workspaceDir;
    if (downloadInfo.save_path) {
      saveDir = path.isAbsolute(downloadInfo.save_path) 
        ? downloadInfo.save_path 
        : path.join(process.cwd(), downloadInfo.save_path);
    } else {
      // 默认保存到downloads目录
      saveDir = path.join(process.cwd(), 'downloads');
    }
    
    // 确保目录存在
    await fs.mkdir(saveDir, { recursive: true });
    
    // 确定文件名
    let filename = downloadInfo.filename;
    if (!filename) {
      // 尝试从Content-Disposition头获取文件名
      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      } else {
        // 从URL中提取文件名
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        filename = path.basename(pathname) || 'download.file';
      }
    }
    
    // 确保文件名有扩展名
    if (!path.extname(filename)) {
      const contentType = response.headers['content-type'] || '';
      const extension = getExtensionFromContentType(contentType);
      if (extension) {
        filename += extension;
      }
    }
    
    const filePath = path.join(saveDir, filename);
    
    // 创建写入流
    const writer = createWriteStream(filePath);
    
    // 将响应流管道到文件
    response.data.pipe(writer);
    
    // 等待下载完成
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // 获取文件大小
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    return {
      success: true,
      status: response.status,
      status_text: response.statusText,
      download_result: {
        success: true,
        file_path: filePath,
        file_size: fileSize,
        filename: filename,
        message: `文件下载成功: ${filename} (${formatFileSize(fileSize)})`
      }
    };
  } catch (error: any) {
    return {
      success: false,
      status: response.status,
      status_text: response.statusText,
      download_result: {
        success: false,
        file_path: '',
        file_size: 0,
        filename: '',
        error: `下载失败: ${error.message}`
      }
    };
  }
}

// 处理普通响应
function handleNormalResponse(response: any): any {
  // 检查响应内容类型，防止二进制数据
  const contentType = response.headers['content-type'] || '';
  const isBinaryContent = isBinaryContentType(contentType);

  // 获取响应数据
  let responseData = response.data;

  // 如果是二进制内容类型，返回截断信息
  if (isBinaryContent) {
    responseData = `[二进制数据已截断，内容类型: ${contentType}]`;
  } else if (typeof responseData === 'string') {
    // 对文本数据进行长度限制，防止上下文爆炸
    const maxLength = 10000; // 最大10KB
    if (responseData.length > maxLength) {
      responseData = responseData.substring(0, maxLength) +
        `\n...[数据已截断，原始长度: ${responseData.length} 字符，截断后: ${maxLength} 字符]`;
    }
  } else if (typeof responseData === 'object') {
    // 如果是对象，转换为JSON并限制长度
    const jsonStr = JSON.stringify(responseData);
    const maxLength = 10000; // 最大10KB
    if (jsonStr.length > maxLength) {
      responseData = JSON.stringify(responseData, null, 2).substring(0, maxLength) +
        `\n...[JSON数据已截断，原始长度: ${jsonStr.length} 字符，截断后: ${maxLength} 字符]`;
    }
  }

  // 返回精简的响应信息
  return {
    status: response.status,
    status_text: response.statusText,
    response_headers: response.headers,
    data: responseData,
    success: response.status >= 200 && response.status < 300,
    truncated: isBinaryContent || (typeof responseData === 'string' && responseData.includes('[数据已截断]'))
  };
}

// 根据内容类型获取文件扩展名
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'application/x-tar': '.tar',
    'application/gzip': '.gz',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'application/javascript': '.js',
    'application/json': '.json',
    'application/xml': '.xml',
  };
  
  for (const [type, ext] of Object.entries(typeMap)) {
    if (contentType.toLowerCase().includes(type)) {
      return ext;
    }
  }
  
  return '';
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数：检查是否为二进制内容类型
function isBinaryContentType(contentType: string): boolean {
  if (!contentType) return false;

  const binaryTypes = [
    // 图片
    'image/',
    // 音频
    'audio/',
    // 视频
    'video/',
    // 压缩文件
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    // PDF
    'application/pdf',
    // Office文档
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 可执行文件
    'application/x-msdownload',
    'application/x-executable',
    // 其他二进制
    'application/octet-stream',
    'binary/',
    // 字体
    'font/',
    // 模型文件
    'model/',
  ];

  return binaryTypes.some(type => contentType.toLowerCase().includes(type));
}