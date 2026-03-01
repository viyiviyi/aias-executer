/**
 * 浏览器工具常量配置
 */

// 配置：需要包含的属性（移除style，因为我们会单独处理有用的样式属性）
export const INCLUDE_ATTRIBUTES = [
  'id',
  // 'class',
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
  'src',
  'href'
] as const;

// 配置：事件属性
export const EVENT_ATTRIBUTES = [
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
export const POSITION_ELEMENTS = [
  'img',
  'button',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="image"]',
] as const;

// 配置：图标元素类型
export const ICON_ELEMENTS = ['i', 'span.icon', 'svg', 'img[src*="icon"]', 'img[alt*="icon"]'] as const;

// 配置：对页面查看有用的样式属性
export const USEFUL_STYLE_PROPERTIES = [
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
export const DEFAULT_STYLE_VALUES: Record<string, Record<string, string>> = {
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
  // 行内元素
  span: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  a: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  strong: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  em: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  code: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  // 表单元素
  input: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  textarea: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  select: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  button: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  // 媒体元素
  img: { display: 'inline-block', position: 'static', float: 'none', clear: 'none' },
  video: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  audio: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  // 其他
  iframe: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
  canvas: { display: 'inline', position: 'static', float: 'none', clear: 'none' },
};