import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';

const browserManager = BrowserManager.getInstance();

// 配置：需要包含的属性（移除style，因为我们会单独处理有用的样式属性）
const INCLUDE_ATTRIBUTES = [
  'id',
  //   'class',
  'type',
  'name',
  'value',
  'placeholder',
  'alt',
  'title',
  'role',
  'aria-label',
  'aria-hidden',
  'tabindex',
  'disabled',
  'readonly',
  'required',
  'checked',
  'selected',
  'contenteditable',
  'draggable',
  'hidden',
] as const;

// 配置：事件属性
const EVENT_ATTRIBUTES = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onsubmit',
  'onreset',
  'onselect',
  //   'onload',
  //   'onunload',
  //   'onerror',
  'onresize',
  'onscroll',
] as const;

// 配置：需要返回位置和大小的元素类型
const POSITION_ELEMENTS = [
  'img',
  'button',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="image"]',
] as const;

// 配置：图标元素类型
const ICON_ELEMENTS = ['i', 'span.icon', 'svg', 'img[src*="icon"]', 'img[alt*="icon"]'] as const;

// 配置：对页面查看有用的样式属性
const USEFUL_STYLE_PROPERTIES = [
  'display', // 布局相关
  //   'position', // 定位相关
  //   'visibility', // 可见性
  //   'opacity', // 透明度
  'cursor', // 鼠标指针
  //   'z-index', // 层级
  //   'overflow', // 溢出处理
  //   'flex', // flex布局
  //   'grid', // grid布局
  //   'float', // 浮动
  //   'clear', // 清除浮动
] as const;

// 元素的默认样式值
const DEFAULT_STYLE_VALUES: Record<string, Record<string, string>> = {
  // 块级元素
  div: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  p: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h1: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h2: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h3: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h4: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h5: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  h6: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  ul: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  ol: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  li: { display: 'list-item', position: 'static', float: 'none', clear: 'none' },
  table: { display: 'table', position: 'static', float: 'none', clear: 'none' },
  form: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  header: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  footer: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  section: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  article: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  aside: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  nav: { display: 'block', position: 'static', float: 'none', clear: 'none' },
  main: { display: 'block', position: 'static', float: 'none', clear: 'none' },

  // 行内元素
  span: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  a: { display: 'inline', position: 'static', cursor: 'pointer', float: 'none', clear: 'none' },
  strong: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  em: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  code: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  small: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  label: { display: 'inline', position: 'static', cursor: 'default', float: 'none', clear: 'none' },

  // 行内块元素
  button: {
    display: 'inline-block',
    position: 'static',
    cursor: 'pointer',
    float: 'none',
    clear: 'none',
  },
  input: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  textarea: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  select: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  img: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  canvas: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  video: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  audio: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },

  // 其他特殊元素
  iframe: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  svg: { display: 'inline', position: 'static', float: 'none', clear: 'none' },

  // 默认值（用于未列出的元素）
  default: {
    display: 'inline',
    position: 'static',
    visibility: 'visible',
    opacity: '1',
    cursor: 'auto',
    'z-index': 'auto',
    overflow: 'visible',
    float: 'none',
    clear: 'none',
    flex: '0 1 auto',
    grid: 'none / none / auto / auto',
  },
};

// 参数类型定义
interface GetPageContentParameters {
  browser_id?: string;
  show_no_visibility?: boolean;
  timeout?: number;
  include_attributes?: string[];
  event_attributes?: string[];
}

// 传递给页面执行的选项类型
interface PageEvaluateOptions {
  showNoVisibility: boolean;
  includeAttributes: string[];
  eventAttributes: string[];
  positionElements: readonly string[];
  iconElements: readonly string[];
  usefulStyleProperties: readonly string[];
  defaultStyleValues: Record<string, Record<string, string>>;
}

// 返回结果类型
interface GetPageContentResult {
  success: boolean;
  session_id: string;
  page_info: {
    title: string;
    url: string;
  };
  body_dom_tree: string;
}

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
        // include_attributes: {
        //   type: 'array',
        //   items: { type: 'string' },
        //   description: '需要包含的属性列表（可选）',
        //   default: INCLUDE_ATTRIBUTES,
        // },
        // event_attributes: {
        //   type: 'array',
        //   items: { type: 'string' },
        //   description: '事件属性列表（可选）',
        //   default: EVENT_ATTRIBUTES,
        // },
      },
      required: [],
    },
    result_use_type: 'last',
  },

  async execute(parameters: GetPageContentParameters): Promise<GetPageContentResult> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;
    const show_no_visibility = parameters.show_no_visibility || false;
    const includeAttributes = parameters.include_attributes || [...INCLUDE_ATTRIBUTES];
    const eventAttributes = parameters.event_attributes || [...EVENT_ATTRIBUTES];

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

      // 传递给页面执行的选项
      const evaluateOptions: PageEvaluateOptions = {
        showNoVisibility: show_no_visibility,
        includeAttributes,
        eventAttributes,
        positionElements: POSITION_ELEMENTS,
        iconElements: ICON_ELEMENTS,
        usefulStyleProperties: USEFUL_STYLE_PROPERTIES,
        defaultStyleValues: DEFAULT_STYLE_VALUES,
      };

      // 获取页面内容 - 优化的DOM树
      const bodyDomTree = await page.evaluate((options: PageEvaluateOptions) => {
        const {
          showNoVisibility,
          includeAttributes,
          eventAttributes,
          positionElements,
          iconElements,
          usefulStyleProperties,
          defaultStyleValues,
        } = options;

        // 检查元素是否可见
        const isVisible = (element: Element): boolean => {
          if (!element || !element.isConnected) {
            return false;
          }

          const style = window.getComputedStyle(element);

          // 检查display
          if (style.display === 'none') {
            return false;
          }

          // 检查visibility
          if (style.visibility === 'hidden' || style.visibility === 'collapse') {
            return false;
          }

          // 检查opacity（透明度为0不可见）
          if (parseFloat(style.opacity) === 0) {
            return false;
          }

          // 检查尺寸
          if (element.clientWidth === 0 && element.clientHeight === 0) {
            return false;
          }

          return true;
        };

        // 检查元素是否有用内容
        const hasUsefulContent = (element: Element): boolean => {
          // 检查是否有文本内容
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 0) {
            return true;
          }

          // 检查是否是图片
          if (element.tagName.toLowerCase() === 'img') {
            return true;
          }

          // 检查是否是链接
          if (element.tagName.toLowerCase() === 'a') {
            return true;
          }

          // 检查是否是按钮或表单元素
          const tagName = element.tagName.toLowerCase();
          if (
            tagName === 'button' ||
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select'
          ) {
            return true;
          }

          // 检查是否有事件绑定
          for (const attr of eventAttributes) {
            if (element.hasAttribute(attr)) {
              return true;
            }
          }

          // 检查是否有可操作属性
          if (
            element.hasAttribute('contenteditable') ||
            element.hasAttribute('draggable') ||
            element.getAttribute('role') === 'button' ||
            element.getAttribute('role') === 'link' ||
            element.getAttribute('role') === 'checkbox' ||
            element.getAttribute('role') === 'radio'
          ) {
            return true;
          }

          // 检查子元素是否有用内容
          for (const child of Array.from(element.children)) {
            if (hasUsefulContent(child)) {
              return true;
            }
          }

          return false;
        };

        // 获取有用的样式属性（过滤默认值）
        const getUsefulStyleAttributes = (element: Element): string[] => {
          const attrs: string[] = [];
          const style = window.getComputedStyle(element);
          const tagName = element.tagName.toLowerCase();

          // 获取该元素的默认样式值
          const elementDefaults = defaultStyleValues[tagName] || defaultStyleValues['default'];

          for (const prop of usefulStyleProperties) {
            const value = style[prop as keyof CSSStyleDeclaration];
            if (value && value !== '' && value !== 'initial' && value !== 'inherit') {
              // 获取该属性的默认值
              const defaultValue = elementDefaults[prop] || '';

              // 只有当值不是默认值时才显示
              if (value !== defaultValue) {
                // 特殊处理一些属性值的格式
                let displayValue = value;

                // 对于flex和grid属性，如果值很复杂，可以简化显示
                if (prop === 'flex' && (value as string).includes(' ')) {
                  displayValue = 'flex'; // 简化显示
                } else if (prop === 'grid' && (value as string).includes('/')) {
                  displayValue = 'grid'; // 简化显示
                }
                // cursor 只显示
                else if (
                  prop == 'cursor' &&
                  !['pointer', 'grab', 'not-allowed'].includes(displayValue as string)
                )
                  continue;

                attrs.push(`style.${prop}=${displayValue}`);
              }
            }
          }

          return attrs;
        };

        // 获取元素属性字符串
        const getAttributesString = (element: Element): string => {
          const attrs: string[] = [];

          // 添加有用的样式属性（已过滤默认值）
          const styleAttrs = getUsefulStyleAttributes(element);
          attrs.push(...styleAttrs);

          // 处理包含的属性
          for (const attrName of includeAttributes) {
            const value = element.getAttribute(attrName);
            if (value !== null && value !== '') {
              // 特殊处理一些属性
              if (attrName === 'src' && value.startsWith('data:image')) {
                // 对于base64图片，只返回头信息
                const match = value.match(/^data:image\/(\w+);base64,/);
                if (match) {
                  attrs.push(`src=data:image/${match[1]};base64,...`);
                }
              } else if (attrName === 'href' && element.tagName.toLowerCase() === 'a') {
                // a标签不返回链接
                continue;
              } else {
                attrs.push(`${attrName}=${value}`);
              }
            }
          }

          // 处理事件属性
          for (const eventAttr of eventAttributes) {
            if (element.hasAttribute(eventAttr)) {
              attrs.push(`${eventAttr}=fn`);
            }
          }

          // 处理位置和大小信息
          const tagName = element.tagName.toLowerCase();
          const rect = element.getBoundingClientRect();

          // 检查是否是位置元素
          const isPositionElement =
            positionElements.includes(tagName) ||
            iconElements.some((selector) => {
              try {
                return element.matches(selector);
              } catch {
                return false;
              }
            });

          if (isPositionElement) {
            attrs.push(`width=${Math.round(rect.width)}`);
            attrs.push(`height=${Math.round(rect.height)}`);
            attrs.push(`x=${Math.round(rect.left + window.scrollX)}`);
            attrs.push(`y=${Math.round(rect.top + window.scrollY)}`);
          }

          return attrs.length > 0 ? ` [${attrs.join('] [')}]` : '';
        };

        // 检查是否是图标元素
        const isIconElement = (element: Element): boolean => {
          const tagName = element.tagName.toLowerCase();
          if (tagName === 'svg') {
            return true;
          }

          // 检查类名或属性是否包含icon
          const className = element.className?.toString().toLowerCase() || '';
          const alt = element.getAttribute('alt')?.toLowerCase() || '';
          const src = element.getAttribute('src')?.toLowerCase() || '';

          return (
            className.includes('icon') ||
            alt.includes('icon') ||
            src.includes('icon') ||
            element.getAttribute('role') === 'img'
          );
        };

        // 递归构建DOM树
        const buildDomTree = (node: Node, depth: number = 0): string[] => {
          const lines: string[] = [];
          const indent = '  '.repeat(depth);

          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 0) {
              lines.push(`${indent}- TEXT ${text}`);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // 检查是否可见
            if (!showNoVisibility && !isVisible(element)) {
              return lines;
            }

            // 检查是否有用内容
            if (!hasUsefulContent(element)) {
              return lines;
            }

            const tagName = element.tagName.toUpperCase();
            const attrsStr = getAttributesString(element);

            // 对于svg图标，不显示path
            if (tagName === 'SVG' && isIconElement(element)) {
              lines.push(`${indent}- ${tagName}${attrsStr}:`);
            } else {
              lines.push(`${indent}- ${tagName}${attrsStr}:`);
            }

            // 处理子节点
            for (const child of Array.from(node.childNodes)) {
              const childLines = buildDomTree(child, depth + 1);
              lines.push(...childLines);
            }
          }

          return lines;
        };

        // 从body开始构建
        const body = document.body;
        const treeLines = buildDomTree(body);

        return treeLines.join('\n');
      }, evaluateOptions);

      return {
        success: true,
        session_id: browserId,
        page_info: {
          title: title,
          url: url,
        },
        body_dom_tree: bodyDomTree,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`获取页面内容失败: ${errorMessage}`);
    }
  },
};
