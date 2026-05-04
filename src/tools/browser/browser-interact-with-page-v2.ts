import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';

const browserManager = BrowserManager.getInstance();

/**
 * 验证坐标是否在页面范围内
 */
function validateCoordinate(x: number, y: number): void {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('坐标必须是数字');
  }
  if (x < 0 || y < 0) {
    throw new Error('坐标不能为负数');
  }
}

export const interactWithPageV2Tool: Tool = {
  definition: {
    name: 'browser_interact_with_page_v2',
    groupName: 'browser',
    description: '操作浏览器，通过坐标点击和直接文本输入（v2版本，不再使用选择器）',
    parameters: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description: '标签页ID',
        },
        action: {
          type: 'string',
          description: '要执行的操作类型',
          enum: [
            'click',
            'double_click',
            'right_click',
            'click_and_hold',
            'type_text',
            'press_key',
            'hover',
            'scroll',
            'go_back',
            'go_forward',
            'reload',
          ],
        },
        x: {
          type: 'integer',
          description: 'X坐标（对于click、double_click、right_click、click_and_hold、hover操作需要）',
        },
        y: {
          type: 'integer',
          description: 'Y坐标（对于click、double_click、right_click、click_and_hold、hover操作需要）',
        },
        text: {
          type: 'string',
          description: '要输入的文本（对于type_text操作需要）',
        },
        key: {
          type: 'string',
          description: '要按下的键（对于press_key操作需要），如Enter、Tab、ArrowDown、Escape等',
        },
        duration: {
          type: 'integer',
          description: '按住持续时间（毫秒）（对于click_and_hold操作需要）',
        },
        scroll_x: {
          type: 'integer',
          description: '横向滚动像素（负值向左，正值向右）',
        },
        scroll_y: {
          type: 'integer',
          description: '纵向滚动像素（负值向上，正值向下）',
        },
        click_count: {
          type: 'integer',
          description: '点击次数（对于click操作可选，默认1次）',
          default: 1,
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
      },
      required: ['tab_id', 'action'],
    },
    guidelines: [
      'v2版本：操作基于坐标，不再使用选择器',
      '使用前可通过截图或页面快照获取元素坐标',
      '坐标基于页面视口左上角为原点 (0, 0)',
      '点击操作会自动聚焦目标元素',
      'type_text会先点击目标位置再输入文本',
      'scroll操作支持正向（向下/右）和负向（向上/左）滚动',
      '操作后会等待页面加载完成',
      '如果操作打开了新标签页，会返回new_tab_id',
      '默认超时时间为30秒，可以自定义',
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.tab_id || 'default';
    const action = parameters.action;
    const x = parameters.x;
    const y = parameters.y;
    const text = parameters.text;
    const key = parameters.key;
    const duration = parameters.duration;
    const scrollX = parameters.scroll_x;
    const scrollY = parameters.scroll_y;
    const clickCount = parameters.click_count || 1;
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
          if (x === undefined || y === undefined) {
            throw new Error('click操作需要x和y坐标参数');
          }
          validateCoordinate(x, y);
          await page.mouse.click(x, y, { clickCount });
          result = { message: `已点击坐标: (${x}, ${y})`, clickCount };
          break;

        case 'double_click':
          if (x === undefined || y === undefined) {
            throw new Error('double_click操作需要x和y坐标参数');
          }
          validateCoordinate(x, y);
          await page.mouse.dblclick(x, y);
          result = { message: `已双击坐标: (${x}, ${y})` };
          break;

        case 'right_click':
          if (x === undefined || y === undefined) {
            throw new Error('right_click操作需要x和y坐标参数');
          }
          validateCoordinate(x, y);
          await page.mouse.click(x, y, { button: 'right' });
          result = { message: `已右键点击坐标: (${x}, ${y})` };
          break;

        case 'click_and_hold':
          if (x === undefined || y === undefined) {
            throw new Error('click_and_hold操作需要x和y坐标参数');
          }
          if (duration === undefined) {
            throw new Error('click_and_hold操作需要duration参数（毫秒）');
          }
          validateCoordinate(x, y);
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.waitForTimeout(duration);
          await page.mouse.up();
          result = { message: `已按住坐标: (${x}, ${y}) 时长: ${duration}ms` };
          break;

        case 'type_text':
          if (text === undefined) {
            throw new Error('type_text操作需要text参数');
          }
          if (x !== undefined && y !== undefined) {
            validateCoordinate(x, y);
            // 先点击目标位置聚焦输入框
            await page.mouse.click(x, y);
            await page.waitForTimeout(100); // 等待聚焦
            result = { message: `已在坐标(${x}, ${y})输入文本: ${text}` };
          } else {
            result = { message: `已在当前焦点位置输入文本: ${text}` };
          }
          await page.keyboard.type(text, { delay: 50 });
          break;

        case 'press_key':
          if (!key) {
            throw new Error('press_key操作需要key参数');
          }
          await page.keyboard.press(key);
          result = { message: `已按下键: ${key}` };
          break;

        case 'hover':
          if (x === undefined || y === undefined) {
            throw new Error('hover操作需要x和y坐标参数');
          }
          validateCoordinate(x, y);
          await page.mouse.move(x, y);
          result = { message: `已移动鼠标到坐标: (${x}, ${y})` };
          break;

        case 'scroll':
          if (scrollX === undefined && scrollY === undefined) {
            throw new Error('scroll操作需要scroll_x或scroll_y参数');
          }
          const scrollOptions: { scrollX?: number; scrollY?: number } = {};
          if (scrollX !== undefined) scrollOptions.scrollX = scrollX;
          if (scrollY !== undefined) scrollOptions.scrollY = scrollY;
          await page.mouse.wheel(scrollX || 0, scrollY || 0);
          result = {
            message: `已滚动页面: 横轴${scrollX || 0}px, 纵轴${scrollY || 0}px`,
          };
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
        await (newPage || page).waitForLoadState('load', { timeout: timeout * 1000 });
      }

      const currentTitle = await (newPage || page).title();
      return {
        success: true,
        action: action,
        result: result,
        title: currentTitle,
        tab_id: newTabId || null,
        url: newTabUrl || null,
        msg: newTabId ? `新标签页已打开，id是[${newTabId}]` : undefined,
        time: new Date().toLocaleString(),
      };
    } catch (error: any) {
      const errorMessage = error.message.toLowerCase();

      // 检查是否是浏览器断开连接相关的错误
      if (
        errorMessage.includes('target closed') ||
        errorMessage.includes('session closed') ||
        errorMessage.includes('browser disconnected') ||
        errorMessage.includes('context closed')
      ) {
        throw new Error(
          `执行操作 ${action} 失败：浏览器已关闭或会话已断开。请重新打开浏览器并导航到页面。原始错误: ${error.message}`
        );
      }

      // 检查是否是页面关闭相关的错误
      if (
        errorMessage.includes('page closed') ||
        errorMessage.includes('target page, context or browser has been closed')
      ) {
        throw new Error(
          `执行操作 ${action} 失败：页面已关闭。可能浏览器已崩溃或页面被意外关闭。请重新打开浏览器并导航到页面。原始错误: ${error.message}`
        );
      }

      // 其他错误
      throw new Error(`执行操作 ${action} 失败: ${error.message}`);
    }
  },
};
