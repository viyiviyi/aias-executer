import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';
import {
  INCLUDE_ATTRIBUTES,
  EVENT_ATTRIBUTES,
  POSITION_ELEMENTS,
  ICON_ELEMENTS,
  USEFUL_STYLE_PROPERTIES,
  DEFAULT_STYLE_VALUES
} from './browser-constants';

const browserManager = BrowserManager.getInstance();

// 参数类型定义
interface GetPageContentParameters {
  browser_id?: string;
  show_no_visibility?: boolean;
  timeout?: number;
  include_attributes?: string[];
  event_attributes?: string[];
  root_selector?: string;
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
  rootSelector?: string;
}
interface PageEvaluateOptions {
  showNoVisibility: boolean;
  includeAttributes: string[];
  eventAttributes: string[];
  positionElements: readonly string[];
  iconElements: readonly string[];
  usefulStyleProperties: readonly string[];
  defaultStyleValues: Record<string, Record<string, string>>;
  rootSelector?: string;
}

// 返回结果类型
interface GetPageContentResult {
  success: boolean;
  session_id: string;
  page_info: {
    title: string;
    url: string;
    root_selector?: string;
  };
  dom_tree: string;
}

export const getPageContentTool: Tool = {
  definition: {
    name: 'get_page_content',
    description: 'playwright读取页面dom树，只展示一次结果，需要的信息需自行整理记录在上下文',
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
        include_attributes: {
          type: 'array',
          items: { type: 'string' },
          description: '需要包含的属性列表（可选）',
          default: INCLUDE_ATTRIBUTES,
        },
        event_attributes: {
          type: 'array',
          items: { type: 'string' },
          description: '事件属性列表（可选）',
          default: EVENT_ATTRIBUTES,
        },
        root_selector: {
          type: 'string',
          description: 'CSS选择器，指定从哪个DOM元素开始获取内容（可选）。如果未指定，则从body元素开始。',
          default: '',
        },
      },
      required: [],
    },

    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: true,      // 只读操作
      destructiveHint: false,  // 非破坏性操作
      idempotentHint: false,   // 非幂等操作（页面内容可能变化）
      openWorldHint: true,     // 开放世界操作（访问外部网页）
      category: 'browser',     // 浏览器操作类别
      version: '1.0.0',       // 工具版本
      tags: ['browser', 'page', 'content', 'dom', 'scraping'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        session_id: { type: 'string', description: '浏览器会话ID' },
        page_info: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '页面标题' },
            url: { type: 'string', description: '页面URL' },
            root_selector: { type: 'string', description: '使用的根选择器' }
          },
          required: ['title', 'url']
        },
        dom_tree: { type: 'string', description: 'DOM树内容' }
      },
      required: ['success', 'session_id', 'page_info', 'dom_tree']
    },

    // 使用指南
    guidelines: [
      '只有最后一次查看的页面在上下文可见',
      '默认不显示不可见的DOM元素',
      '可以指定根选择器来获取特定区域的内容',
      '支持自定义包含的属性和事件属性',
      '返回的DOM树经过优化，只包含有用的内容'
    ],

    result_use_type: 'last',
  },

  async execute(parameters: GetPageContentParameters): Promise<GetPageContentResult> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;
    const show_no_visibility = parameters.show_no_visibility || false;
    const includeAttributes = parameters.include_attributes || [...INCLUDE_ATTRIBUTES];
    const eventAttributes = parameters.event_attributes || [...EVENT_ATTRIBUTES];
    const rootSelector = parameters.root_selector || '';

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
        rootSelector,
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
          rootSelector,
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
            tagName === 'a' ||
            tagName === 'img' ||
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
            if (value && value !== '' && value !== 'initial' && value !== 'inherit' && (!element.parentElement || value != window.getComputedStyle(element.parentElement)[prop as keyof CSSStyleDeclaration])) {
              // 获取该属性的默认值
              const defaultValue = elementDefaults[prop] || '';
              // 只有当值不是默认值时才显示
              if (value !== defaultValue) {
                // 特殊处理一些属性值的格式
                let displayValue = value;
                // 只显cursor 
                if (
                  prop == 'cursor' &&
                  ['pointer', 'grab', 'not-allowed'].includes(displayValue as string)
                )
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
              }
              else if (attrName === 'href') {
                attrs.push(`href=${value}`);
              }
              // 如果是class，清除一些特定格式的css
              else if (attrName == 'class') {
                const classNames = value.split(' ').filter(f => {
                  if (/-\d+$|-data-|^data-|\[|\]|sc-|^[a-zA-z0-9]{1,2}-|bg-|^flex$|^grid$/.test(f)) return false;
                  if (/-(full|center|aria|left|right|top|bottom|text|max|min|fill|row|col|auto)\b/.test(f)) return false;
                  if (/\b(flex|aria|border|text|loading|row|col|auto|react)-/.test(f)) return false;
                  return true;
                })
                if (classNames.length)
                  attrs.push(`${attrName}=${classNames.join(' ')}`);
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
            attrs.push(`w=${Math.round(rect.width)}`);
            attrs.push(`h=${Math.round(rect.height)}`);
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

        // 确定根节点
        let rootElement: Element | null = document.body;
        if (rootSelector && rootSelector.trim() !== '') {
          try {
            const element = document.querySelector(rootSelector);
            if (element) {
              rootElement = element;
            } else {
              console.warn(`未找到选择器 ${rootSelector} 对应的元素，将使用body作为根节点`);
            }
          } catch (error) {
            console.warn(`选择器 ${rootSelector} 无效，将使用body作为根节点`);
          }
        }

        // 从根节点开始构建
        const treeLines = buildDomTree(rootElement);

        return treeLines.join('\n');
      }, evaluateOptions);

      return {
        success: true,
        session_id: browserId,
        page_info: {
          title: title,
          url: url,
          root_selector: rootSelector || undefined,
        },
        dom_tree: bodyDomTree,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`获取页面内容失败: ${errorMessage}`);
    }
  },
};
