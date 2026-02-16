import axios, { AxiosRequestConfig } from 'axios';
import { Tool } from '../../core/tool-registry';

export const httpRequestTool: Tool = {
  definition: {
    name: 'http_request',
    description: '代理HTTP请求，不响应二进制流',
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
    }
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

      // 返回精简的响应信息
      return {
        status: response.status,
        status_text: response.statusText,
        headers: response.headers,
        data: response.data,
        success: response.status >= 200 && response.status < 300
      };
    } catch (error: any) {
      if (error.response) {
        // 服务器响应了错误状态码
        return {
          status: error.response.status,
          status_text: error.response.statusText,
          headers: error.response.headers,
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