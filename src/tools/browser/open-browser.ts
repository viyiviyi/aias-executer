import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';

const browserManager = BrowserManager.getInstance();

export const openBrowserTool: Tool = {
  definition: {
    name: 'open_browser',
    description: 'playwright打开浏览器，用于访问互联网、网站、测试网页等，默认可联网',
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
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const url = parameters.url;
    const browserType = parameters.browser || 'chrome';
    const sessionName = parameters.session_name || 'default';
    const headless = parameters.headless !== undefined ? parameters.headless : false;
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
      // 创建浏览器会话
      const session = await browserManager.createSession(sessionName, browserType, headless);
      
      // 导航到指定URL
      await browserManager.navigateTo(sessionName, url, timeout * 1000);

      // 获取页面基本信息
      const page = session.page;
      const title = await page.title();
      const urlAfterNavigation = page.url();

      return {
        success: true,
        session_id: sessionName,
        browser_type: browserType,
        headless: headless,
        page_info: {
          title: title,
          url: urlAfterNavigation,
          original_url: url
        },
        message: `浏览器已成功打开并导航到 ${url}`,
        sessions_count: browserManager.listSessions().length
      };
    } catch (error: any) {
      // 如果创建会话失败，确保清理
      await browserManager.closeSession(sessionName).catch(() => {});
      
      throw new Error(`打开浏览器失败: ${error.message}`);
    }
  }
};