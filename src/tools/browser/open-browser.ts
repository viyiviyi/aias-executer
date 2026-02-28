import { Tool } from '@/types/Tool';
import { BrowserManager } from '../../core/browser-manager';

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
        session_name: {
          type: 'string',
          description: '浏览器会话名称（可选），用于管理多个浏览器会话',
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
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（创建浏览器会话）
      destructiveHint: false,   // 非破坏性操作
      idempotentHint: false,    // 非幂等操作（多次调用可能创建多个会话）
      openWorldHint: true,      // 开放世界操作（访问外部网页）
      category: 'browser',      // 浏览器操作类别
      version: '1.0.0',        // 工具版本
      tags: ['browser', 'open', 'navigate', 'session'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        session_id: { type: 'string', description: '浏览器会话ID' },
        config: {
          type: 'object',
          properties: {
            browser_type: { type: 'string', description: '浏览器类型' },
            headless: { type: 'boolean', description: '是否无头模式' },
            anti_detection: { type: 'boolean', description: '是否启用反检测' },
            user_data_dir: { type: 'string', description: '用户数据目录' },
            stealth_enabled: { type: 'boolean', description: '是否启用隐身模式' },
            stealth_features_count: { type: 'integer', description: '隐身功能数量' }
          },
          required: ['browser_type', 'headless', 'anti_detection', 'stealth_enabled', 'stealth_features_count']
        },
        page_info: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '页面标题' },
            url: { type: 'string', description: '页面URL' },
            original_url: { type: 'string', description: '原始请求URL' }
          },
          required: ['title', 'url', 'original_url']
        },
        message: { type: 'string', description: '操作结果消息' },
        sessions_count: { type: 'integer', description: '当前会话总数' }
      },
      required: ['success', 'session_id', 'config', 'page_info', 'message', 'sessions_count']
    },

    // 使用指南
    guidelines: [
      '默认使用配置文件中的浏览器设置',
      '可以指定会话名称来管理多个浏览器会话',
      '支持反检测功能，避免被网站识别为自动化工具',
      '默认超时时间为30秒，可以自定义',
      '会自动验证URL格式'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const url = parameters.url;
    const sessionName = parameters.session_name || 'default';
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
      // 获取配置
      const config = browserManager.getConfig();

      // 创建浏览器会话（使用配置文件中的默认设置）
      const session = await browserManager.createSession(
        sessionName,
        config.defaultBrowser,
        config.defaultHeadless,
        config.antiDetection,
        config.userDataDir
      );

      // 导航到指定URL
      await browserManager.navigateTo(sessionName, url, timeout * 1000);

      // 获取页面基本信息
      const page = session.page;
      const title = await page.title();
      const urlAfterNavigation = page.url();

      // 获取反检测状态
      const stealthStatus = {
        enabled: config.antiDetection && config.stealthOptions.enable,
        features: config.antiDetection && config.stealthOptions.enable ? [
          'webdriver属性隐藏',
          '用户代理伪装',
          'WebGL指纹修改',
          'Canvas指纹修改',
          '屏幕分辨率修改',
          '硬件信息修改'
        ] : []
      };

      return {
        success: true,
        session_id: sessionName,
        config: {
          browser_type: config.defaultBrowser,
          headless: config.defaultHeadless,
          anti_detection: config.antiDetection,
          user_data_dir: config.userDataDir,
          stealth_enabled: stealthStatus.enabled,
          stealth_features_count: stealthStatus.features.length
        },
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
      await browserManager.closeSession(sessionName).catch(() => { });

      throw new Error(`打开浏览器失败: ${error.message}`);
    }
  }
};