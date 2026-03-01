/**
 * 浏览器相关类型定义
 */

export interface BrowserSession {
  browser: any;
  context: any;
  page: any;
  createdAt: Date;
  lastUsed: Date;
  config: {
    browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge';
    headless: boolean;
    antiDetection: boolean;
    userDataDir?: string;
  };
}

export interface BrowserConfig {
  browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge';
  headless: boolean;
  antiDetection: boolean;
  userDataDir?: string;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout?: number;
  extraHTTPHeaders?: Record<string, string>;
}