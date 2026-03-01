import { Tool } from '@/types/tools/Tool';
import axios, { AxiosRequestConfig } from 'axios';

export const httpRequestTool: Tool = {
  definition: {
    name: 'http_request',
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
        data: { type: 'string', description: '响应数据（文本格式）' },
      },
      required: ['success', 'status', 'statusText', 'headers', 'data',]
    },

    // 使用指南
    guidelines: [
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
      responseType: 'text', // 只接收文本响应
      validateStatus: () => true // 接受所有状态码
    };

    // 处理请求体
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