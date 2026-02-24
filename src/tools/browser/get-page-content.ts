import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';

const browserManager = BrowserManager.getInstance();

export const getPageContentTool: Tool = {
  definition: {
    name: 'get_page_content',
    description: 'playwright读取页面快照（获取完整的页面内容）',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '浏览器ID（会话名称）',
          default: 'default',
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300,
        },
      },
      required: [],
    },
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在，请先使用 open_browser 打开浏览器`);
    }

    try {
      const page = session.page;

      // 等待页面完全加载
      await page.waitForLoadState('networkidle', { timeout: timeout * 1000 });

      // 获取页面基本信息
      const title = await page.title();
      const url = page.url();

      // 获取页面内容 简单dom数
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        const isDisplay = (e: HTMLElement): boolean => {
          // 检查元素是否存在
          if (!e || !e.isConnected) {
            return false;
          }

          // 检查元素的 display 样式
          const style = window.getComputedStyle(e);
          if (style.display === 'none') {
            return false;
          }

          // 检查元素的 visibility 样式
          if (style.visibility === 'hidden' || style.visibility === 'collapse') {
            return false;
          }

          // 检查元素的 opacity
          if (parseFloat(style.opacity) === 0) {
            return false;
          }

          // 检查元素的尺寸
          const rect = e.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return false;
          }

          // 检查元素是否在视口内（可选，根据需求决定）
          // 如果希望只返回可见区域内的元素，可以启用以下检查
          /*
          if (
            rect.top > window.innerHeight ||
            rect.bottom < 0 ||
            rect.left > window.innerWidth ||
            rect.right < 0
          ) {
            return false;
          }
          */

          return true;
        };

        const getElement = (e: HTMLElement, depth = 0): string => {
          let html = '';
          if (typeof e == 'string') return e;
          if (isDisplay(e)) {
            html += `${''.padEnd(depth, ' ')}${e.tagName.toLowerCase()}:`;
            if (e.children && e.children.length) {
              html += `\n`;
              html += Array.from(e.children)
                .map((v) => getElement(v as HTMLElement, depth + 1))
                .filter((f) => f)
                .join('');
            } else {
              if (e.innerText) html += ` ${e.innerText}`;
              const ele = e as any;
              e.getAttributeNames().forEach((attrName) => {
                attrName = attrName.toLowerCase();
                if (
                  ([
                    'href',
                    'src',
                    'type',
                    'alt',
                    'title',
                    'placeholder',
                    'id',
                    'data-ai-placeholder',
                  ].includes(attrName) ||
                    attrName.startsWith('data-')) &&
                  (ele[attrName] || ele[attrName.toUpperCase()])
                )
                  html += ` ${attrName}: ${ele[attrName] || ele[attrName.toUpperCase()]}`;
              });
              html += `\n`;
            }
          }
          return html;
        };
        return getElement(body);
      });

      return {
        success: true,
        session_id: browserId,
        page_info: {
          title: title,
          url: url,
        },
        body_content: bodyContent,
      };
    } catch (error: any) {
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  },
};
