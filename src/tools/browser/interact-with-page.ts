import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';

const browserManager = BrowserManager.getInstance();

export const interactWithPageTool: Tool = {
  definition: {
    name: 'interact_with_page',
    description: 'playwright操作浏览器，输入、点击、滚动等',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '浏览器ID（会话名称）',
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
            'goto',
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
        url: {
          type: 'string',
          description: '要导航到的URL（对于goto操作需要）',
        },
        wait_for_navigation: {
          type: 'boolean',
          description: '操作后是否等待页面导航完成',
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
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const action = parameters.action;
    const selector = parameters.selector;
    const text = parameters.text;
    const value = parameters.value;
    const key = parameters.key;
    const url = parameters.url;
    const x = parameters.x;
    const y = parameters.y;
    const waitForNavigation =
      parameters.wait_for_navigation !== undefined ? parameters.wait_for_navigation : true;
    const timeout = parameters.timeout || 30;

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在，请先使用 open_browser 打开浏览器`);
    }

    const page = session.page;
    let result: any = {};

    try {
      switch (action) {
        case 'click':
          if (!selector) {
            throw new Error('click操作需要selector参数');
          }
          await page.click(selector, { timeout: timeout * 1000 });
          if (waitForNavigation) {
            await page.waitForLoadState('domcontentloaded', { timeout: timeout * 1000 });
          }
          result = { message: `已点击元素: ${selector}` };
          break;

        case 'click_coordinate':
          if (x === undefined || y === undefined) {
            throw new Error('click_coordinate操作需要x和y参数');
          }
          await page.mouse.click(x, y);
          if (waitForNavigation) {
            await page.waitForLoadState('domcontentloaded', { timeout: timeout * 1000 });
          }
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

        case 'goto':
          if (!url) {
            throw new Error('goto操作需要url参数');
          }
          await browserManager.navigateTo(browserId, url, timeout * 1000);
          result = { message: `已导航到: ${url}` };
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

      // 获取操作后的页面状态
      const currentUrl = page.url();
      const currentTitle = await page.title();

      return {
        success: true,
        session_id: browserId,
        action: action,
        result: result,
        page_state: {
          url: currentUrl,
          title: currentTitle,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`执行操作 ${action} 失败: ${error.message}`);
    }
  },
};
