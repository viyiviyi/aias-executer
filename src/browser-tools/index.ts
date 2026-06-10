/**
 * 浏览器工具注册 - 从 tools/browser 目录重新导出
 */

// 重新导出所有浏览器工具
export { navigateToPageTool } from '../tools/browser/open-browser';
export { getPageContentTool } from '../tools/browser/browser-get-page-content';
export { getPageContentV2Tool } from '../tools/browser/browser-get-page-content-v2';
export { interactWithPageTool } from '../tools/browser/browser-interact-with-page';
export { interactWithPageV2Tool } from '../tools/browser/browser-interact-with-page-v2';
export { closeBrowserTool } from '../tools/browser/close-browser';
export { browserConfigTool } from '../tools/browser/browser-config-tool';

/**
 * 注册所有浏览器工具（初始化 BrowserManager）
 */
import { BrowserManager } from '../core/browser/browser-manager';

export function registerBrowserTools(): void {
  // 初始化 BrowserManager 单例
  console.log('🔧 初始化浏览器管理器...');
  BrowserManager.getInstance();
  console.log('✅ 浏览器管理器已初始化');
}