import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';

const browserManager = BrowserManager.getInstance();

export const interactWithPageTool: Tool = {
  definition: {
    name: 'browser_interact_with_page',
    groupName: 'browser',
    description: 'playwright操作浏览器，输入、点击、滚动等',
    parameters: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description: '标签页ID（可选），用于管理多个标签页，默认为default',
          default: 'default',
        },
        action: {
          type: 'string',
          description: '要执行的操作类型',
          enum: [
            'click',
            'fill',
            'press',
            'hover',
            'select',
            'check',
            'uncheck',
            'go_back',
            'go_forward',
            'reload',
          ],
        },
        selector: {
          type: 'string',
          description: 'CSS选择器（对于click、fill、hover、press、select、check、uncheck操作需要）',
        },
        text: {
          type: 'string',
          description: '要输入的文本（对于fill操作需要）',
        },
        value: {
          type: 'string',
          description: '要选择的值（对于select操作需要）',
        },
        key: {
          type: 'string',
          description: '要按下的键（对于press操作需要），如Enter、Tab、ArrowDown等',
        },
        wait_for_navigation: {
          type: 'boolean',
          description: '操作后是否等待页面导航完成，无效参数，所以操作都会等待页面加载完成',
          default: true,
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300,
        },
        x: {
          type: 'integer',
          description: 'X坐标（对于click_coordinate操作需要）',
        },
        y: {
          type: 'integer',
          description: 'Y坐标（对于click_coordinate操作需要）',
        },
      },
      required: ['action'],
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false, // 非只读操作（交互操作）
      destructiveHint: true, // 破坏性操作（可能修改页面状态）
      idempotentHint: false, // 非幂等操作（多次交互可能产生不同结果）
      openWorldHint: true, // 开放世界操作（与外部网页交互）
      category: 'browser', // 浏览器操作类别
      version: '1.0.0', // 工具版本
      tags: ['browser', 'interact', 'click', 'fill', 'navigate', 'automation'], // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        tab_id: { type: 'string', description: '浏览器标签页ID' },
        action: { type: 'string', description: '执行的操作类型' },
        result: {
          type: 'object',
          properties: {
            message: { type: 'string', description: '操作结果消息' },
          },
          required: ['message'],
        },
        page_state: {
          type: 'object',
          properties: {
            url: { type: 'string', description: '操作后的页面URL' },
            title: { type: 'string', description: '操作后的页面标题' },
          },
          required: ['url', 'title'],
        },
        new_tab_id: { type: 'string', description: '如果操作打开了新标签页，返回新标签页的ID' },
        new_tab_url: { type: 'string', description: '如果操作打开了新标签页，返回新标签页的URL' },
        timestamp: { type: 'string', description: '操作时间戳' },
      },
      required: ['success', 'tab_id', 'action', 'result', 'page_state', 'timestamp'],
    },

    // 使用指南
    guidelines: [
      '支持多种交互操作：点击、填写、悬停、选择等',
      '不同操作需要不同的参数组合',
      '操作后会等待页面加载完成',
      '返回操作后的页面状态信息',
      '如果操作打开了新标签页，会返回new_tab_id，可用于直接获取页面内容',
      '默认超时时间为30秒，可以自定义',
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.tab_id || 'default';
    const action = parameters.action;
    const selector = parameters.selector;
    const text = parameters.text;
    const value = parameters.value;
    const key = parameters.key;
    const x = parameters.x;
    const y = parameters.y;
    const waitForNavigation =
      parameters.wait_for_navigation !== undefined ? parameters.wait_for_navigation : true;
    const timeout = parameters.timeout || 30;

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在。可能的原因：
1. 浏览器已关闭或崩溃
2. 会话已过期（默认30分钟）
3. 从未创建过该会话

请先使用 navigate_to_page 工具打开浏览器并导航到页面，或检查浏览器是否正常运行。`);
    }

    const page = session.page;
    let result: any = {};
    let newTabId: string | undefined = undefined;
    let newTabUrl: string | undefined = undefined;

    try {
      // 在switch之前设置新页面监听器（带超时）
      const newPagePromise = session.context.waitForEvent('page', { timeout: 1000 }).catch(() => null);

      switch (action) {
        case 'click':
          if (!selector) {
            throw new Error('click操作需要selector参数');
          }

          // 执行点击
          await page.click(selector, { timeout: timeout * 1000 });

          result = { message: `已点击元素: ${selector}` };
          break;

        case 'click_coordinate':
          if (x === undefined || y === undefined) {
            throw new Error('click_coordinate操作需要x和y参数');
          }

          // 执行坐标点击
          await page.mouse.click(x, y);

          result = { message: `已点击坐标: (${x}, ${y})` };
          break;

        case 'fill':
          if (!selector || !text) {
            throw new Error('fill操作需要selector和text参数');
          }

          await page.locator(selector).focus();
          await page.fill(selector, text, { timeout: timeout * 1000 });

          result = { message: `已填充 ${selector} 内容: ${text}` };
          break;

        case 'press':
          if (!key) {
            throw new Error('press操作需要key参数');
          }

          if (selector) {
            await page.press(selector, key, { timeout: timeout * 1000 });
            result = { message: `已在 ${selector} 按下键: ${key}` };
          } else {
            await page.keyboard.press(key);
            result = { message: `已按下键: ${key}` };
          }

          break;

        case 'hover':
          if (!selector) {
            throw new Error('hover操作需要selector参数');
          }

          await page.hover(selector, { timeout: timeout * 1000 });

          result = { message: `已悬停在元素: ${selector}` };
          break;

        case 'select':
          if (!selector || !value) {
            throw new Error('select操作需要selector和value参数');
          }

          await page.selectOption(selector, value, { timeout: timeout * 1000 });

          result = { message: `已在 ${selector} 选择值: ${value}` };
          break;

        case 'check':
          if (!selector) {
            throw new Error('check操作需要selector参数');
          }

          await page.check(selector, { timeout: timeout * 1000 });

          result = { message: `已勾选元素: ${selector}` };
          break;

        case 'uncheck':
          if (!selector) {
            throw new Error('uncheck操作需要selector参数');
          }

          await page.uncheck(selector, { timeout: timeout * 1000 });

          result = { message: `已取消勾选元素: ${selector}` };
          break;


        case 'go_back':
          await page.goBack({ timeout: timeout * 1000 });

          result = { message: '已返回上一页' };
          break;

        case 'go_forward':
          await page.goForward({ timeout: timeout * 1000 });

          result = { message: '已前进到下一页' };
          break;

        case 'reload':
          await page.reload({ timeout: timeout * 1000, waitUntil: 'domcontentloaded' });

          result = { message: '已重新加载页面' };
          break;

        default:
          throw new Error(`不支持的操作类型: ${action}`);
      }

      // 等待新页面（如果有）
      const newPage = await newPagePromise;
      if (newPage) {
        // 注册新标签页
        newTabId = await browserManager.registerNewTab(browserId, newPage);
        // 获取新标签页的URL
        newTabUrl = newPage.url();
      }

      // 如果需要等待页面加载
      if (waitForNavigation) {
        await page.waitForLoadState('load', { timeout: timeout * 1000 });
      }

      // 获取操作后的页面状态
      // const currentUrl = page.url();
      const currentTitle = await page.title();
      console.log(newTabUrl);
      return {
        success: true,
        // session_id: browserId,
        action: action,
        result: result,
        page_state: {
          title: currentTitle,
        },
        new_tab_id: newTabId || null,
        new_tab_url: newTabUrl || null,
        tips: newTabId ? `新标签页已打开，id是[${newTabId}]，需要使用新标签页id获取页面内容或操作标签页` : undefined,
        time: new Date().toLocaleString(),
      };
    } catch (error: any) {
      const errorMessage = error.message.toLowerCase();

      // 检查是否是浏览器断开连接相关的错误
      if (errorMessage.includes('target closed') ||
        errorMessage.includes('session closed') ||
        errorMessage.includes('browser disconnected') ||
        errorMessage.includes('context closed')) {
        throw new Error(`执行操作 ${action} 失败：浏览器已关闭或会话已断开。请重新打开浏览器并导航到页面。原始错误: ${error.message}`);
      }

      // 检查是否是页面关闭相关的错误
      if (errorMessage.includes('page closed') || errorMessage.includes('target page, context or browser has been closed')) {
        throw new Error(`执行操作 ${action} 失败：页面已关闭。可能浏览器已崩溃或页面被意外关闭。请重新打开浏览器并导航到页面。原始错误: ${error.message}`);
      }

      // 其他错误
      throw new Error(`执行操作 ${action} 失败: ${error.message}`);
    }
  },
};