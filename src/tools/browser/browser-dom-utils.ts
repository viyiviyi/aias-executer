/**
 * DOM 处理工具函数 - 管道模式处理
 * 所有判断逻辑在外部执行，page.evaluate 只返回原始 DOM 树
 */

// ==================== 类型定义 ====================

/**
 * DOM 节点（page.evaluate 返回的结构）
 */
export interface RawDomNode {
  tag: string;
  text?: string;
  child?: RawDomNode[];
  /** 元素属性 */
  attrs?: Record<string, string>;
  /** 文档坐标 */
  x?: number;
  y?: number;
  /** 宽高 */
  w?: number;
  h?: number;
}

/**
 * 处理后的 DOM 节点
 */
export interface ProcessedDomNode extends RawDomNode {
  /** 是否可见（外部计算） */
  visible?: boolean;
  /** 是否在视口内（外部计算） */
  inViewport?: boolean;
  /** 是否交互式元素（外部计算） */
  isInteractive?: boolean;
  /** 是否有用内容（外部计算） */
  hasUsefulContent?: boolean;
}

/**
 * DOM 管道选项
 */
export interface DomPipelineOptions {
  /** 是否仅返回交互式元素 */
  accessibilityOnly: boolean;
  /** 是否显示完整dom结构 */
  fullDom: boolean;
  /** 需要包含的属性列表 */
  includeAttributes: string[];
  /** 事件属性列表 */
  eventAttributes: string[];
  /** 必要属性（必定包含） */
  essentialAttributes: string[];
  /** 需要排除的属性 */
  excludeAttributes: string[];
  /** 是否包含样式属性 */
  includeStyles: boolean;
  /** 缩减层数（0表示不缩减） */
  reduceDepth: number;
}

/**
 * 检查元素是否可见（外部计算）
 */
export function computeVisibility(node: ProcessedDomNode): boolean {
  if (node.tag === 'text') return true;

  // 检查 display
  if (node.attrs?.['style']?.includes('display: none')) return false;
  if (node.attrs?.['style']?.includes('display:none')) return false;

  // 检查 visibility
  if (node.attrs?.['style']?.includes('visibility: hidden')) return false;
  if (node.attrs?.['style']?.includes('visibility:collapse')) return false;

  // 检查 opacity
  const opacityMatch = node.attrs?.['style']?.match(/opacity:\s*([\d.]+)/);
  if (opacityMatch && parseFloat(opacityMatch[1]) === 0) return false;

  // 检查 hidden 属性
  if (node.attrs?.['hidden'] !== undefined) return false;

  // 检查尺寸为0
  if (node.w === 0 && node.h === 0) return false;

  return true;
}

/**
 * 检查元素是否在视口内（外部计算）
 */
export function computeInViewport(
  node: ProcessedDomNode,
  viewport: { width: number; height: number }
): boolean {
  if (node.tag === 'text') return true;
  if (
    node.x === undefined ||
    node.y === undefined ||
    node.w === undefined ||
    node.h === undefined
  ) {
    return true; // 无法判断，默认返回 true
  }

  const right = node.x + node.w;
  const bottom = node.y + node.h;

  return node.y < viewport.height && bottom > 0 && node.x < viewport.width && right > 0;
}

/**
 * 检查是否交互式元素（外部计算）
 */
export function computeIsInteractive(
  node: ProcessedDomNode,
  eventAttributes: string[]
): boolean {
  if (node.tag === 'text') return false;

  const tag = node.tag.toLowerCase();

  // 按钮类
  if (tag === 'button') return true;

  // 输入类
  if (tag === 'input') {
    const type = node.attrs?.['type'] || 'text';
    if (type !== 'hidden') return true;
  }

  // 表单类
  if (['textarea', 'select', 'option'].includes(tag)) return true;

  // 链接
  if (tag === 'a' && node.attrs?.['href']) return true;

  // 有事件属性
  for (const attr of eventAttributes) {
    if (node.attrs?.[attr]) return true;
  }

  // 可编辑
  if (node.attrs?.['contenteditable'] !== undefined) return true;
  if (node.attrs?.['draggable'] !== undefined) return true;

  // role 属性
  const role = node.attrs?.['role'];
  if (
    ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option', 'slider', 'spinbutton', 'switch'].includes(
      role || ''
    )
  ) {
    return true;
  }

  // 特殊标签
  if (tag === 'label') return true;
  if (tag === 'details' || tag === 'summary') return true;

  return false;
}

/**
 * 检查是否有用内容（外部计算）
 * 如果元素本身不满足条件，但有子节点包含有用内容，也视为有意义的元素。
 */
export function computeHasUsefulContent(
  node: ProcessedDomNode,
  eventAttributes: string[]
): boolean {
  if (node.tag === 'text') {
    return (node.text?.trim().length || 0) > 0;
  }

  const tag = node.tag.toLowerCase();

  // 有文本内容
  if (node.text?.trim()) return true;

  // 特殊标签（a 标签的 href 长度超过 500 则视为无效的直接丢弃）
  if (tag === 'a') {
    const href = node.attrs?.['href'] || '';
    if (href.length > 500) return false;
  } else if (['img', 'button', 'input', 'textarea', 'select', 'video', 'audio'].includes(tag)) {
    return true;
  }

  // 有事件属性
  for (const attr of eventAttributes) {
    if (node.attrs?.[attr]) return true;
  }

  // 可编辑
  if (node.attrs?.['contenteditable'] !== undefined) return true;
  if (node.attrs?.['draggable'] !== undefined) return true;

  // role 属性
  const role = node.attrs?.['role'];
  if (['button', 'link', 'checkbox', 'radio'].includes(role || '')) return true;

  // 有子节点包含有用内容（递归检查）
  if (node.child) {
    for (const child of node.child) {
      if (computeHasUsefulContent(child, eventAttributes)) return true;
    }
  }

  return false;
}

/**
 * 批量计算节点属性
 */
export function computeNodeProperties(
  nodes: RawDomNode[],
  options: DomPipelineOptions
): ProcessedDomNode[] {
  const { eventAttributes } = options;

  const processNode = (node: RawDomNode): ProcessedDomNode => {
    const processed: ProcessedDomNode = {
      ...node,
      visible: true,
      inViewport: true,
      isInteractive: false,
      hasUsefulContent: false,
    };

    if (node.tag === 'text') {
      processed.visible = true;
      processed.inViewport = true;
      processed.hasUsefulContent = computeHasUsefulContent(processed, eventAttributes);
      return processed;
    }

    // 计算属性
    processed.visible = computeVisibility(processed);
    processed.isInteractive = computeIsInteractive(processed, eventAttributes);
    processed.hasUsefulContent = computeHasUsefulContent(processed, eventAttributes);

    // 递归处理子节点
    if (node.child) {
      processed.child = computeNodeProperties(node.child, options);
    }

    return processed;
  };

  return nodes.map(processNode);
}

// ==================== 管道处理函数 ====================

/**
 * 3. 过滤交互式/有用内容元素
 *
 * 当一个节点被过滤掉时，递归过滤其子节点并保留所有有用的子树（扁平化提升），
 * 防止内容因祖先被过滤而丢失。
 */
export function filterByContent(
  dom: ProcessedDomNode[],
  options: DomPipelineOptions
): ProcessedDomNode[] {
  const nodePasses = (node: ProcessedDomNode): boolean => {
    if (node.tag === 'text') return true;
    if (options.accessibilityOnly) !!node.hasUsefulContent && !!node.isInteractive;
    return !!node.hasUsefulContent;
  };

  const filterNode = (node: ProcessedDomNode): ProcessedDomNode[] => {
    if (node.tag === 'text') return [node];

    // 先递归过滤子节点（即使当前节点被过滤，也要让有用的子节点通过）
    const filteredChild: ProcessedDomNode[] = node.child
      ? node.child.flatMap(filterNode)
      : [];

    // 如果当前节点满足条件，保留它（带上过滤后的子节点）
    if (nodePasses(node)) {
      return [{ ...node, child: filteredChild.length > 0 ? filteredChild : undefined }];
    }

    // 当前节点被过滤：返回所有有用的子节点（扁平化提升到当前位置）
    return filteredChild;
  };

  return dom.flatMap(filterNode);
}

/**
 * 4. 合并文本节点（同时计算合并后每个节点的累计文本）
 */
export function mergeTextNodes(dom: ProcessedDomNode[]): ProcessedDomNode[] {
  // 内联元素标签
  const inlineTags = new Set([
    'span', 'strong', 'em', 'i', 'b', 'u', 'mark', 'small', 'sub', 'sup', 'del', 'ins', 'code',
  ]);
  // 需要保留的元素标签（特殊标签不合并）
  const keepTags = new Set([
    'a', 'img', 'button', 'input', 'textarea', 'select', 'label', 'code', 'pre',
    'video', 'audio', 'svg', 'canvas', 'iframe', 'br', 'hr',
  ]);

  /**
   * 递归处理节点，返回 null 表示该节点已被合并到父节点
   */
  const processNode = (node: ProcessedDomNode): ProcessedDomNode | null => {
    if (node.tag === 'text') return node;

    const tagLower = node.tag.toLowerCase();
    const isInline = inlineTags.has(tagLower);
    const hasSpecialAttr =
      node.attrs?.['href'] ||
      node.attrs?.['src'] ||
      node.attrs?.['onclick'] ||
      node.attrs?.['type'] ||
      node.attrs?.['alt'];
    const shouldKeep = keepTags.has(tagLower) || hasSpecialAttr;

    // 递归处理子节点
    let processedChild: ProcessedDomNode[] = [];
    if (node.child) {
      for (const child of node.child) {
        const processed = processNode(child);
        if (processed) processedChild.push(processed);
      }
    }

    // 收集所有文本内容
    const collectText = (n: ProcessedDomNode): string => {
      let text = '';
      if (n.tag === 'text' && n.text) text += n.text + ' ';
      else if (n.child) for (const c of n.child) text += collectText(c);
      else if (n.text) text += n.text + ' ';
      return text;
    };

    const allText = collectText({ ...node, child: processedChild }).trim();

    // 内联元素且无特殊属性，返回文本节点
    if (isInline && !shouldKeep && allText.length > 0) {
      return { tag: 'text', text: allText };
    }

    const result: ProcessedDomNode = {
      tag: node.tag,
      attrs: node.attrs,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    };

    if (processedChild.length > 0) result.child = processedChild;
    if (allText.length > 0 && (!result.child || result.child.length === 0)) {
      result.text = allText;
    }

    return result;
  };

  // 顶层合并相邻文本
  const result: ProcessedDomNode[] = [];
  let currentText: string | null = null;

  for (const node of dom) {
    const processed = processNode(node);
    if (!processed) continue;

    if (processed.tag === 'text') {
      if (currentText === null) currentText = processed.text || '';
      else currentText += ' ' + (processed.text || '');
    } else {
      if (currentText !== null && currentText.trim().length > 0) {
        result.push({ tag: 'text', text: currentText.trim() });
        currentText = null;
      }
      result.push(processed);
    }
  }

  if (currentText !== null && currentText.trim().length > 0) {
    result.push({ tag: 'text', text: currentText.trim() });
  }

  return result;
}

/**
 * 5. 缩减 DOM 层数（先合并文本再缩减，防止合并文本后可缩减但未缩减）
 * img 标签在缩减过程中保留宽高和坐标
 */
export function reduceDomDepth(
  dom: ProcessedDomNode[],
  maxDepth: number,
  currentDepth: number = 0
): ProcessedDomNode[] {
  if (maxDepth <= 0 || currentDepth >= maxDepth) return dom;

  const result: ProcessedDomNode[] = [];

  for (const node of dom) {
    if (node.tag === 'text') {
      result.push(node);
      continue;
    }

    let newChild: ProcessedDomNode[] | undefined;
    if (node.child && node.child.length > 0) {
      newChild = reduceDomDepth(node.child, maxDepth, currentDepth + 1);
    }

    const newNode: ProcessedDomNode = {
      tag: node.tag,
      attrs: node.attrs,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
      child: newChild,
      text: node.text,
    };

    // img 标签永远保留位置信息
    const isImg = node.tag.toLowerCase() === 'img';

    // 单子节点覆盖父节点，但 img 保留位置
    if (newChild && newChild.length === 1 && newChild[0].tag !== 'text') {
      const onlyChild = newChild[0];
      const childIsImg = onlyChild.tag.toLowerCase() === 'img';
      if (isImg || childIsImg) {
        // img 标签：合并子节点信息但保留自己的位置
        result.push({
          ...onlyChild,
          x: onlyChild.x ?? node.x,
          y: onlyChild.y ?? node.y,
          w: onlyChild.w ?? node.w,
          h: onlyChild.h ?? node.h,
          tag: onlyChild.tag, // 保持子节点 tag
          attrs: onlyChild.attrs,
          child: onlyChild.child,
          text: onlyChild.text,
        });
      } else {
        result.push(onlyChild);
      }
    } else {
      result.push(newNode);
    }
  }

  return result;
}

/**
 * 6. 过滤属性（白名单 + 黑名单）
 * 保留 includeAttributes + essentialAttributes，排除 excludeAttributes
 */
export function filterAttributes(
  dom: ProcessedDomNode[],
  includeAttributes: string[],
  essentialAttributes: string[],
  excludeAttributes: string[]
): ProcessedDomNode[] {
  const allowed = new Set([...includeAttributes, ...essentialAttributes]);

  const filterNode = (node: ProcessedDomNode): ProcessedDomNode => {
    let newAttrs = node.attrs;
    if (newAttrs) {
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(newAttrs)) {
        if (excludeAttributes.includes(key)) continue;
        if (allowed.has(key)) {
          filtered[key] = value;
        }
      }
      newAttrs = Object.keys(filtered).length > 0 ? filtered : undefined;
    }

    return {
      ...node,
      attrs: newAttrs,
      child: node.child
        ? filterAttributes(node.child, includeAttributes, essentialAttributes, excludeAttributes)
        : undefined,
    };
  };

  return dom.map(filterNode);
}

/**
 * 7. 过滤 style 属性（默认不显示）
 */
export function filterStyles(
  dom: ProcessedDomNode[],
  includeStyles: boolean
): ProcessedDomNode[] {
  if (includeStyles) return dom;

  const filterNode = (node: ProcessedDomNode): ProcessedDomNode => {
    let newAttrs = node.attrs;
    if (newAttrs && 'style' in newAttrs) {
      newAttrs = { ...newAttrs };
      delete newAttrs.style;
      if (Object.keys(newAttrs).length === 0) newAttrs = undefined;
    }

    return {
      ...node,
      attrs: newAttrs,
      child: node.child ? filterStyles(node.child, includeStyles) : undefined,
    };
  };

  return dom.map(filterNode);
}

/**
 * 7. 丰富 img 标签信息：显示宽高和基于文档的坐标
 */
export function enrichImgTags(dom: ProcessedDomNode[]): ProcessedDomNode[] {
  return dom.map(node => {
    if (node.tag.toLowerCase() === 'img') {
      // img 标签必须保留 x, y, w, h
      return {
        ...node,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
      };
    }
    if (node.child) {
      return { ...node, child: enrichImgTags(node.child) };
    }
    return node;
  });
}

/**
 * 8. 丰富窄元素信息（前3层）
 * 规则：宽度 < 父元素宽度 - 20 时，显示宽高位置；否则清除位置信息
 */
export function enrichNarrowElements(
  dom: ProcessedDomNode[],
  depth: number = 0,
  parentWidth?: number
): ProcessedDomNode[] {
  if (depth > 2) return dom;

  return dom.map(node => {
    if (node.tag === 'text') return node;

    const hasWidth = node.w !== undefined && node.w > 0;
    const isNarrow =
      parentWidth !== undefined && hasWidth && node.w! < parentWidth - 20;
    const needsPosition = depth <= 2 && isNarrow;

    // 窄元素显示位置，宽元素清除位置（避免信息冗余）
    const finalNode: ProcessedDomNode = {
      ...node,
      x: needsPosition ? node.x : undefined,
      y: needsPosition ? node.y : undefined,
      w: needsPosition ? node.w : undefined,
      h: needsPosition ? node.h : undefined,
    };

    finalNode.child = node.child
      ? enrichNarrowElements(node.child, depth + 1, needsPosition ? node.w : parentWidth)
      : undefined;

    return finalNode;
  });
}

// ==================== DOM 管道 - 完整处理流程 ====================

/**
 * DOM 管道处理流程：
 * 1. 计算节点属性（可见性、视口、交互性等）
 * 2. 过滤不可见元素
 * 3. 过滤视口外元素
 * 4. 过滤内容元素
 * 5. 合并文本节点
 * 6. 缩减层数（先合并文本再缩减）
 * 7. 过滤属性（白名单 + 黑名单）
 * 8. 过滤 style 属性（默认不显示）
 * 9. 丰富 img 标签信息（显示宽高和坐标）
 * 10. 丰富窄元素信息（前3层）
 */
export function domPipeline(
  rawDom: RawDomNode[],
  options: DomPipelineOptions
): ProcessedDomNode[] {
  // 1. 计算节点属性
  let result = computeNodeProperties(rawDom, options);
  // console.log(result)

  // 4. 过滤内容元素
  result = filterByContent(result, options);
  // console.log(result)

  // 5. 合并文本节点
  result = mergeTextNodes(result);
  // console.log(result)

  // 6. 缩减层数（先合并文本再缩减）
  if (options.reduceDepth > 0) {
    result = reduceDomDepth(result, options.reduceDepth);
  }
  // console.log(result)

  // 7. 过滤属性（白名单 + 黑名单）
  result = filterAttributes(result, options.includeAttributes, options.essentialAttributes, options.excludeAttributes);

  // 8. 过滤 style 属性（默认不显示）
  result = filterStyles(result, options.includeStyles);
  // console.log(result)

  // 9. 丰富 img 标签信息
  result = enrichImgTags(result);
  // console.log(result)

  // 9. 丰富窄元素信息
  result = enrichNarrowElements(result, 0);
  // console.log(result)

  return result;
}

// ==================== 输出格式化 ====================

/**
 * 将 DOM 树转换为 OpenAI API 内容块格式
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageUrlBlock {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type ContentBlock = TextBlock | ImageUrlBlock;

/**
 * 过滤无意义的 class 名
 */
function filterClassNames(classValue: string): string {
  return classValue
    .split(' ')
    .filter(f => {
      if (/-\d+$|-data-|^data-|\[|\]|sc-|^[a-zA-z0-9]{1,2}-|bg-|^flex$|^grid$/.test(f)) return false;
      if (/-(full|center|aria|left|right|top|bottom|text|max|min|fill|row|col|auto)\b/.test(f)) return false;
      if (/\b(flex|aria|border|text|loading|row|col|auto|react)-/.test(f)) return false;
      return true;
    })
    .join(' ');
}
export function domToContentBlock(
  dom: ProcessedDomNode[]
): ContentBlock {
  return { type: 'text', text: domToContentItem(dom).join('\n') }
}

export function domToContentItem(
  dom: ProcessedDomNode[],
  depth: number = 0,
  parentWidth = 0
): string[] {
  const blocks: string[] = [];

  dom.forEach(node => {
    if (node.tag === 'text') {
      if (node.text) {
        blocks.push(`${' '.repeat(depth)}-${node.text}`);
      }
      return;
    }

    // 构建元素描述
    const tag = node.tag.toLowerCase();

    // 构建属性字符串
    const attrParts: string[] = [];

    if (node.attrs) {
      for (const [key, value] of Object.entries(node.attrs)) {
        if (key === 'class') {
          const filtered = filterClassNames(value);
          if (filtered.length) attrParts.push(`${key}="${filtered}"`);
        } else {
          attrParts.push(`${key}="${value}"`);
        }
      }
    }

    // 位置信息
    const posParts: string[] = [];
    if (node.w && node.w < parentWidth - 20 || parentWidth == 0) {
      if (node.x !== undefined) posParts.push(`x=${node.x}`);
      if (node.y !== undefined) posParts.push(`y=${node.y}`);
      if (node.w !== undefined) posParts.push(`w=${node.w}`);
      if (node.h !== undefined) posParts.push(`h=${node.h}`);
    }

    const attrStr = attrParts.length > 0 ? ` [${attrParts.join('] [')}]` : '';
    const posStr = posParts.length > 0 ? ` [${posParts.join('] [')}]` : '';
    const textStr = node.text ? ` "${node.text}"` : '';

    const desc = tag + attrStr + posStr + textStr;
    blocks.push(`${' '.repeat(depth)}-${desc}`);

    // 递归处理子节点
    if (node.child && node.child.length > 0) {
      blocks.push(...domToContentItem(node.child, depth + 1, node.w));
    }
  });

  return blocks;
}
