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
        show_no_visibility: {
          type: 'boolean',
          description: '是否显示无法看见的dom',
          default: false,
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
    result_use_type: 'last',
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;
    const show_no_visibility = parameters.show_no_visibility || false;

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
      const bodyDomTree = await page.evaluate(
        (arg: Record<string, any>) => {
          const body = document.body;
          const isDisplay = (e: HTMLElement): boolean => {
            // 检查元素是否存在
            if (!e || !e.isConnected) {
              return false;
            }

            // 如果显示不可见元素，以下条件都不计算
            if (arg.show_no_visibility) return true;

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

            if (e.tagName.toLowerCase() == 'svg') return false;
            if (
              e.getElementsByTagName('a').length ||
              e.getElementsByTagName('img').length ||
              e.getElementsByTagName('input').length ||
              e.getElementsByTagName('textarea').length ||
              e.getElementsByTagName('image').length ||
              e.getElementsByTagName('button').length
            )
              return true;

            // 检查是否有可见子元素
            if (e.children && e.children.length) {
              let subIsVisible = false;
              for (const sub of Array.from(e.children)) {
                if (isDisplay(sub as HTMLElement)) subIsVisible = true;
              }
              if (!subIsVisible) return false;
            }

            return true;
          };
          const attrNames = [
            'src',
            'type',
            'alt',
            'title',
            'placeholder',
            'name',
            'value',
            'checked',
            'disabled',
            'hidden',
            'readOnly',
            'selected',
            'required',
            'class',
            'id',
            'class',
            'offsetTop',
            'offsetLeft',
            'contenteditable',
            'onclick',
            'onkeypress',
          ];
          const getElement = (e: HTMLElement, depth = 0, w = 0, h = 0): string => {
            let html = '';
            if (isDisplay(e)) {
              html += `${''.padEnd(depth * 2, ' ')}- ${e.tagName.toUpperCase()}`;
              // 如果没有子元素，且有innerText，innerText展示在标签后面
              if (e.innerText && (!e.children || !e.children.length)) html += ` ${e.innerText}`;
              // 属性
              if (e.style.display) html += ` [style.display=${e.style.display}]`;
              if (e.clientWidth != w) html += ` [clientWidth=${e.clientWidth}]`;
              if (e.clientHeight != h) html += ` [clientHeight=${e.clientHeight}]`;
              const ele = e as any;
              [
                ...e.getAttributeNames().filter((f) => !attrNames.includes(f.toLowerCase())),
                ...attrNames,
              ].forEach((attrName) => {
                let val: string = ele[attrName] || ele[attrName.toUpperCase()];
                if (attrNames.includes(attrName) && val) {
                  // 处理一些特殊的值
                  if (attrName == 'src' && val.startsWith('data:')) val = '';
                  if (attrName == 'contenteditable' && val !== 'true') val = '';
                  if (attrName == 'offsetLeft' && Number(val) < 16) val = '';
                  if (attrName == 'offsetTop' && Number(val) < 16) val = '';
                  if (attrName == 'onclick' && val) val = 'fn';
                  if (attrName == 'onkeypress' && val) val = 'fn';
                  if (val) html += ` [${attrName}=${val}]`;
                }
              });
              if (e.style.cursor?.toLowerCase() == 'pointer') html += ` [style.cursor=pointer]`;
              if (e.style.position?.toLowerCase() == 'absolute')
                html += ` [style.position=absolute]`;
              if (e.style.position?.toLowerCase() == 'fixed') html += ` [style.position=fixed]`;
              if (e.style.visibility?.toLowerCase() == 'hidden')
                html += ` [style.visibility=hidden]`;
              if (e.style.visibility?.toLowerCase() == 'collapse')
                html += ` [style.visibility=collapse]`;
              if (e.style.opacity?.toLowerCase() == '0') html += ` [style.opacity=0]`;
              html += `:\n`;
              if (e.children && e.children.length) {
                html += Array.from(e.children)
                  .map((v) =>
                    getElement(v as HTMLElement, depth + 1, e.clientWidth, e.clientHeight)
                  )
                  .filter((f) => f)
                  .join('');
              }
            }
            return html;
          };
          return getElement(body);
        },
        { show_no_visibility: show_no_visibility }
      );

      return {
        success: true,
        session_id: browserId,
        page_info: {
          title: title,
          url: url,
        },
        body_dom_tree: bodyDomTree,
      };
    } catch (error: any) {
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  },
};
