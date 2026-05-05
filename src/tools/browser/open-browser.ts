import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';

const browserManager = BrowserManager.getInstance();

export const navigateToPageTool: Tool = {
  definition: {
    name: 'browser_navigate_to_page',
    groupName: 'browser',
    description: '浏览器导航到指定URL页面',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要打开的URL地址'
        },
        tab_id: {
          type: 'string',
          description: '标签页ID（可选），用于管理多个标签页，默认为default',
          default: 'default'
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
    // 使用指南
    guidelines: [
      '导航到指定URL页面，如果浏览器会话不存在则自动创建',
      '默认使用配置文件中的浏览器设置',
      '可以指定会话名称来管理多个浏览器会话',
      '支持反检测功能，避免被网站识别为自动化工具',
      '默认超时时间为30秒，可以自定义',
      '会自动验证URL格式'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const url = parameters.url;
    const tabId = parameters.tab_id || 'default';
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

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // 获取配置
        const config = browserManager.getConfig();

        // 创建浏览器会话（使用配置文件中的默认设置）
        const session = await browserManager.createSession(
          tabId,
          config.defaultBrowser,
          config.defaultHeadless,
          config.antiDetection,
          config.userDataDir
        );

        // 导航到指定URL
        await browserManager.navigateTo(tabId, url, timeout * 1000);

        // 获取页面基本信息
        const page = session.page;
        const title = await page.title();
        // const urlAfterNavigation = page.url();

        // 获取所有标签页信息（使用浏览器管理器中注册的真实标签页ID）
        const allSessions = browserManager.listSessions();
        const tabsInfo = allSessions.map((s) => ({
          tab_id: s.id,
          url: s.page.url(),
          is_active: s.id === tabId,
        }));

        return {
          success: true,
          tab_id: tabId,
          page_info: {
            title: title,
            // url: urlAfterNavigation,
            // original_url: url
          },
          message: `已成功导航到 ${url} 可使用标签页id获取页面内容`,
          sessions_count: browserManager.listSessions().length,
          tabs: tabsInfo,
        };
      } catch (error: any) {
        retryCount++;

        // 检查错误类型，判断是否需要重试
        const errorMessage = error.message.toLowerCase();
        const shouldRetry = errorMessage.includes('target closed') ||
                           errorMessage.includes('session closed') ||
                           errorMessage.includes('browser disconnected') ||
                           errorMessage.includes('浏览器会话不存在');

        if (retryCount <= maxRetries && shouldRetry) {
          console.log(`导航失败，第 ${retryCount} 次重试...`);

          // 清理失败的会话
          await browserManager.closeSession(tabId).catch(() => {});

          // 等待一段时间后重试（指数退避）
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 如果创建会话失败，确保清理
        await browserManager.closeSession(tabId).catch(() => {});

        // 根据错误类型提供更清晰的错误信息
        if (shouldRetry) {
          throw new Error(`导航到页面失败：浏览器已关闭或会话不存在。请检查浏览器是否正常运行。原始错误: ${error.message}`);
        } else {
          throw new Error(`导航到页面失败: ${error.message}`);
        }
      }
    }

    // 理论上不会执行到这里，因为循环内会抛出错误
    throw new Error('导航到页面失败：未知错误');
  }
};