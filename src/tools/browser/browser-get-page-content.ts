/**
 * 浏览器获取页面内容工具（v1兼容版本）
 * 实际委托给 v2 版本处理
 */
import { getPageContentV2Tool } from './browser-get-page-content-v2';

// 重新导出 v2 工具作为 v1 兼容版本
export const getPageContentTool = getPageContentV2Tool;
