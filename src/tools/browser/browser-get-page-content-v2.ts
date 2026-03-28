import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';
import {
  INCLUDE_ATTRIBUTES,
  EVENT_ATTRIBUTES,
} from './browser-constants';
import {
  RawDomNode,
  DomPipelineOptions,
  domPipeline,
  domToContentBlock,
  ContentBlock,
} from './browser-dom-utils';

const browserManager = BrowserManager.getInstance();

// ==================== 类型定义 ====================

interface GetPageContentV2Parameters {
  tab_id?: string;
  /** 是否查看完整DOM（默认false，返回精简DOM）。建议仅在需要分析复杂页面结构或调试时使用。 */
  full_dom?: boolean;
  /** 是否包含页面截图（默认false）。建议在需要识别图像内容、验证码或复杂样式时使用。 */
  screenshot?: boolean;
  /** 范围：viewport（视口）或 fullpage（全页） */
  scope?: 'viewport' | 'fullpage';
  /** 截图质量（1-100），仅对jpeg格式有效 */
  screenshot_quality?: number;
  /** 截图格式 */
  screenshot_format?: 'png' | 'jpeg';
  /** 截图选择器 */
  screenshot_selector?: string;
  /** 超时时间（秒） */
  timeout?: number;
  /** CSS选择器，指定从哪个DOM元素开始获取内容 */
  root_selector?: string;
  /** 需要额外包含的属性列表 */
  extra_attributes?: string[];
  /** 需要排除的属性列表 */
  exclude_attributes?: string[];
  /** 是否包含样式属性（默认false） */
  include_styles?: boolean;
  /** 缩减层数（默认3层，0表示不缩减）。先合并文本再缩减层数。 */
  reduce_depth?: number;
}

/** page.evaluate 返回的 DOM 节点结构 */
interface PageDomNode {
  tag: string;
  text?: string;
  attrs?: Record<string, string>;
  child?: PageDomNode[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  inViewport?: boolean;
}

/** 返回结果结构 - OpenAI API 内容块格式 */
type PageContentResult = ContentBlock[];

// ==================== 布局元素提取函数 ====================

/**
 * 提取页面主要布局分区（仅顶层结构化分区）
 * 返回 YAML 格式的选择器列表
 */
async function extractLayoutSelectors(page: import('playwright').Page): Promise<string> {
  const selectors = await page.evaluate(() => {
    const layoutTags = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN', 'SECTION', 'ARTICLE'];
    const results: { tag: string; selector: string }[] = [];

    for (const tag of layoutTags) {
      const elements = document.querySelectorAll(tag.toLowerCase());
      for (const el of Array.from(elements)) {
        // 只取 body 直系子代的布局元素（顶层分区）
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          parent = parent.parentElement;
        }
        if (parent !== document.body) continue;

        let selector = '';
        if (el.id) {
          selector = `#${el.id}`;
        } else {
          const classes = Array.from(el.classList)
            .filter(c => c.trim() !== '')
            .slice(0, 2)
            .join('.');
          selector = classes
            ? `${tag.toLowerCase()}.${classes}`
            : tag.toLowerCase();
        }

        results.push({ tag, selector });
      }
    }

    return results;
  });

  if (selectors.length === 0) {
    return 'layout_selectors: []';
  }

  const yaml = selectors
    .map(s => `  - ${s.selector}  # ${s.tag}`)
    .join('\n');

  return `layout_selectors:\n${yaml}`;
}

// 截图选项类型
interface ScreenshotOptions {
  type: 'fullpage' | 'viewport';
  quality: number;
  format: 'png' | 'jpeg';
  selector?: string;
}

// ==================== 截图函数 ====================

async function takeScreenshot(
  page: import('playwright').Page,
  options: ScreenshotOptions
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { type, quality, format, selector } = options;
  const screenshotOptions: Record<string, unknown> = {
    type: format,
    quality: format === 'jpeg' ? quality : undefined,
  };

  if (selector && selector.trim() !== '') {
    const element = await page.$(selector);
    if (element) {
      const buffer = await element.screenshot(screenshotOptions);
      const boundingBox = await element.boundingBox();
      return {
        buffer,
        width: boundingBox ? Math.round(boundingBox.width) : 0,
        height: boundingBox ? Math.round(boundingBox.height) : 0,
      };
    } else {
      console.warn(`未找到选择器 ${selector} 对应的元素，将截图整个页面`);
    }
  }

  if (type === 'fullpage') {
    screenshotOptions.fullPage = true;
  }

  const buffer = await page.screenshot(screenshotOptions);
  let width = 0, height = 0;

  if (type === 'fullpage') {
    const pageSize = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    width = pageSize.width;
    height = pageSize.height;
  } else {
    const viewportSize = page.viewportSize();
    width = viewportSize?.width ?? 0;
    height = viewportSize?.height ?? 0;
  }

  return { buffer, width, height };
}

// ==================== 工具定义 ====================

export const getPageContentV2Tool: Tool = {
  definition: {
    name: 'browser_get_page_content_v2',
    groupName: 'browser',
    description: '读取浏览器页面内容（v2版本）- 默认返回精简DOM、按视口过滤、层数缩减',
    parameters: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description: '标签页ID',
          default: 'default',
        },
        full_dom: {
          type: 'boolean',
          description: '是否查看完整DOM（默认false，返回精简DOM）。建议仅在需要分析复杂页面结构或调试时使用。',
          default: false,
        },
        screenshot: {
          type: 'boolean',
          description: '是否包含页面截图（默认false）。仅在需要识别图像内容、验证码或复杂样式时使用。',
          default: false,
        },
        scope: {
          type: 'string',
          description: '范围：viewport（视口）或 fullpage（全页）',
          enum: ['viewport', 'fullpage'],
          default: 'viewport',
        },
        screenshot_quality: {
          type: 'integer',
          description: '截图质量（1-100），仅对jpeg格式有效',
          default: 80,
          minimum: 1,
          maximum: 100,
        },
        screenshot_format: {
          type: 'string',
          description: '截图格式',
          enum: ['png', 'jpeg'],
          default: 'png',
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300,
        },
        root_selector: {
          type: 'string',
          description: 'CSS选择器，指定从哪个DOM元素开始获取内容（可选）',
          default: '',
        },
        extra_attributes: {
          type: 'array',
          items: { type: 'string' },
          description: '需要额外包含的属性列表（默认已包含必要属性：id, href, src, alt）',
          default: [],
        },
      },
      required: ['tab_id'],
    },

    guidelines: [
      '默认只返回视口内可见的DOM元素（精简DOM）',
      'full_dom=true 时返回完整DOM，建议仅在需要分析复杂页面结构或调试时使用',
      'screenshot=true 时额外返回页面截图，建议在需要识别图像内容、验证码或复杂样式时使用',
      '返回数据格式为 YAML 结构字符串',
      'img 标签会显示宽高和文档坐标',
      '前三层窄元素（宽度小于父元素-20）会显示宽高位置'
    ],

    result_use_type: 'last',
  },

  async execute(parameters: GetPageContentV2Parameters): Promise<PageContentResult> {
    const browserId = parameters.tab_id || 'default';
    const timeout = parameters.timeout || 30;
    const fullDom = parameters.full_dom ?? false;
    const includeScreenshot = parameters.screenshot ?? false;
    const scope = parameters.scope || 'viewport';
    const screenshotQuality = parameters.screenshot_quality || 80;
    const screenshotFormat = parameters.screenshot_format || 'png';
    const rootSelector = parameters.root_selector || '';
    const extraAttributes = parameters.extra_attributes || [];
    const excludeAttributes = parameters.exclude_attributes || [];
    const reduceDepth = parameters.reduce_depth ?? 3;

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在。请先使用 navigate_to_page 工具打开浏览器并导航到页面。`);
    }
    try {
      const page = session.page;
      await page.waitForLoadState('domcontentloaded', { timeout: timeout * 1000 });

      // 获取页面基本信息
      const title = await page.title();
      const url = page.url();

      // 计算最终要包含的属性列表
      // essentialAttributes: 必须包含的必要属性（id, href, src, alt, srcset）
      const essentialAttributes: string[] = [
        'id',
        'href',
        'src',
        'alt',
        'srcset',
        'type',
      ];
      const baseAttributes: string[] = [...INCLUDE_ATTRIBUTES];
      const includeAttributes: string[] = [
        ...baseAttributes.filter(attr => !excludeAttributes.includes(attr)),
        ...extraAttributes.filter(
          attr => !baseAttributes.includes(attr) && !excludeAttributes.includes(attr)
        ),
      ];

      // 从 page.evaluate 获取完整的 DOM 树（在回调内判断视口）
      const fullDomTree = await page.evaluate((options: {
        rootSelector: string;
        viewportOnly: boolean
      }) => {
        // 检查元素是否在视口内
        const isInViewport = (element: Element): boolean => {
          const rect = element.getBoundingClientRect();
          const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          return (
            rect.top < viewportHeight &&
            rect.bottom > 0 &&
            rect.left < viewportWidth &&
            rect.right > 0
          );
        };

        // 递归构建 DOM 树
        const buildDomTree = (node: Node): PageDomNode[] => {
          const result: PageDomNode[] = [];

          // 检查元素是否可见
          const isVisible = (element: Element): boolean => {
            if (!element || !element.isConnected) {
              return false;
            }

            const style = window.getComputedStyle(element);
            if (!style) return false;
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
              if (element.children) {
                for (const s of Array.from(element.children)) {
                  if (isVisible(s)) return true;
                }
              } else
                return false;
            }

            // 如果viewportOnly为true，跳过视口检查
            if (options.viewportOnly) {
              return true;
            }

            // 检查是否在视口内
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            // 元素完全或部分在视口内
            const isInViewport = (
              rect.top < viewportHeight &&
              rect.bottom > 0 &&
              rect.left < viewportWidth &&
              rect.right > 0
            );

            if (!isInViewport) {
              return false;
            }

            return true;
          };

          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 0) {
              result.push({ tag: 'text', text });
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (isVisible(element)) {
              const tagName = element.tagName.toUpperCase();

              // 获取元素所有属性
              const attrs: Record<string, string> = {};
              for (const attr of Array.from(element.attributes)) {
                attrs[attr.name] = attr.value;
              }

              // 获取 computed style（全部收集，管道中再过滤是否显示）
              const computedStyle = window.getComputedStyle(element);
              const styleStr = computedStyle.cssText;
              if (styleStr) {
                attrs['style'] = styleStr;
              }

              // 获取位置信息和视口判断
              const rect = element.getBoundingClientRect();
              const dom: PageDomNode = {
                tag: tagName,
                attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
                x: Math.round(rect.left + window.scrollX),
                y: Math.round(rect.top + window.scrollY),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                inViewport: isInViewport(element),
              };

              // 处理子节点
              for (const child of Array.from(node.childNodes)) {
                const childNodes = buildDomTree(child);
                if (childNodes.length > 0) {
                  if (!dom.child) dom.child = [];
                  dom.child.push(...childNodes);
                }
              }

              result.push(dom);
            }
          }

          return result;
        };

        // 确定根节点
        let rootElement: Element | null = document.body;
        if (options.rootSelector && options.rootSelector.trim() !== '') {
          try {
            const element = document.querySelector(options.rootSelector);
            if (element) rootElement = element;
          } catch {
            console.warn(`选择器 ${options.rootSelector} 无效，将使用body作为根节点`);
          }
        }

        return buildDomTree(rootElement);
      }, {
        rootSelector, viewportOnly: scope == 'viewport'
      });

      // 构建返回结果 - OpenAI API 内容块格式
      const result: ContentBlock[] = [];

      // 页面信息
      result.push({
        type: 'text',
        text: `[tab_id: ${browserId}]\n[title: ${title}]\n[url: ${url}]`,
      });

      // 截图
      if (includeScreenshot) {
        const screenshotResult = await takeScreenshot(page, {
          type: scope === 'fullpage' ? 'fullpage' : 'viewport',
          quality: screenshotQuality,
          format: screenshotFormat,
          selector: rootSelector,
        });

        result.push(
          { type: 'text', text: '页面截图: ' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/${screenshotFormat};base64,${screenshotResult.buffer.toString('base64')}`,
              detail: 'high',
            },
          });
      }
      result.push({ type: 'text', text: '页面dom树: ' });

      const pipelineOptions: DomPipelineOptions = {
        fullDom,
        accessibilityOnly: false, // 保留有用内容
        includeAttributes,
        eventAttributes: [...EVENT_ATTRIBUTES],
        essentialAttributes,
        excludeAttributes,
        includeStyles: parameters.include_styles ?? false,
        reduceDepth,
      };
      const processedDom = domPipeline(fullDomTree as RawDomNode[], pipelineOptions);

      result.push(domToContentBlock(processedDom));

      // 提取布局元素选择器并追加到结果末尾
      const layoutSelectorsYaml = await extractLayoutSelectors(page);
      result.push({ type: 'text', text: `\n${layoutSelectorsYaml}` });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorMessageLower = errorMessage.toLowerCase();

      if (
        errorMessageLower.includes('target closed') ||
        errorMessageLower.includes('session closed') ||
        errorMessageLower.includes('browser disconnected') ||
        errorMessageLower.includes('context closed') ||
        errorMessageLower.includes('page closed')
      ) {
        throw new Error(`获取页面内容失败：浏览器已关闭或会话已断开。请重新打开浏览器并导航到页面。原始错误: ${errorMessage}`);
      }

      throw new Error(`获取页面内容失败: ${errorMessage}`);
    }
  },
};
