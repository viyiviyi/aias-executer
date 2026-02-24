import { Tool } from '../../core/tool-registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const openBrowserTool: Tool = {
  definition: {
    name: 'open_browser',
    description: '在浏览器打开URL，直到页面加载完成或超时才返回是否成功和浏览器ID',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要打开的URL地址'
        },
        browser: {
          type: 'string',
          description: '浏览器类型（chrome, firefox, webkit, msedge）',
          default: 'chrome',
          enum: ['chrome', 'firefox', 'webkit', 'msedge']
        },
        session_name: {
          type: 'string',
          description: '浏览器会话名称（可选），用于管理多个浏览器会话',
          default: 'default'
        },
        headless: {
          type: 'boolean',
          description: '是否以无头模式运行（不显示浏览器界面）',
          default: false
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300
        }
      },
      required: ['url']
    },
    result_use_type: 'once'
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const url = parameters.url;
    const browser = parameters.browser || 'chrome';
    const sessionName = parameters.session_name || 'default';
    // headless参数保留但不使用，因为playwright-cli不支持headless模式
    const timeout = parameters.timeout || 30;

    if (!url) {
      throw new Error('url参数不能为空');
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`无效的URL格式: ${url}`);
    }

    try {
      // 构建playwright-cli命令
      let command = `playwright-cli`;
      
      // 如果有会话名称，添加到命令中
      if (sessionName !== 'default') {
        command += ` -s=${sessionName}`;
      }
      
      // 添加浏览器参数
      command += ` open --browser=${browser}`;
      
      // 添加URL
      command += ` ${url}`;

      // 执行命令
      // 执行命令，忽略stdout输出，只检查stderr
      const { stderr } = await execAsync(command, {
        cwd: process.cwd()
      });

      // 精简返回结果
      const result = {
        success: true,
        browser_id: sessionName,
        browser_type: browser,
        url: url,
        message: `浏览器已成功打开并导航到 ${url}`
      };

      // 检查是否有错误输出
      if (stderr && stderr.trim()) {
        result.success = false;
        result.message = `浏览器打开失败: ${stderr.trim()}`;
      }

      return result;

    } catch (error: any) {
      // 处理执行错误
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`命令执行超时（${timeout}秒）`);
      }
      
      if (error.stderr) {
        throw new Error(`playwright-cli执行错误: ${error.stderr}`);
      }
      
      throw new Error(`浏览器打开失败: ${error.message}`);
    }
  }
};