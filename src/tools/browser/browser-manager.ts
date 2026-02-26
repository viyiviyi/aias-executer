import {
  Browser,
  BrowserContext,
  LaunchOptions,
  Page,
  chromium,
  firefox,
  webkit,
} from 'playwright';
import { BrowserConfigManager } from '../../core/browser-config';
import { StealthUtils } from '../../core/stealth-utils';
import * as path from 'path';
import * as fs from 'fs';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: Date;
  lastUsed: Date;
  config: {
    browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge';
    headless: boolean;
    antiDetection: boolean;
    userDataDir?: string;
  };
}

export class BrowserManager {
  private static instance: BrowserManager;
  private sessions: Map<string, BrowserSession> = new Map();
  private configManager = BrowserConfigManager.getInstance();
  private mainBrowser: Browser | null = null;
  private mainContext: BrowserContext | null = null;

  private constructor() {
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  private async getOrCreateMainBrowser(
    browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge',
    headless: boolean,
    antiDetection: boolean,
    userDataDir?: string
  ): Promise<{ browser: Browser; context: BrowserContext }> {
    // 如果主浏览器已经存在，直接返回
    if (this.mainBrowser && this.mainContext) {
      return { browser: this.mainBrowser, context: this.mainContext };
    }

    const config = this.configManager.getConfig();
    let playwrightBrowser;

    switch (browserType) {
      case 'chrome':
        playwrightBrowser = chromium;
        break;
      case 'firefox':
        playwrightBrowser = firefox;
        break;
      case 'webkit':
        playwrightBrowser = webkit;
        break;
      case 'msedge':
        playwrightBrowser = chromium; // Edge使用Chromium引擎
        break;
      default:
        playwrightBrowser = chromium;
    }

    const launchOptions: LaunchOptions = {
      headless,
      args: config.args,
    };
    
    if (!userDataDir) userDataDir = './browser-data';
    
    // 如果启用了用户数据目录
    if (userDataDir && userDataDir.trim() !== '') {
      const fullPath = path.isAbsolute(userDataDir)
        ? userDataDir
        : path.join(process.cwd(), userDataDir);
      userDataDir = fullPath;

      // 确保目录存在
      try {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      } catch (error) {
        console.warn(`创建用户数据目录失败: ${error}`);
      }
    }

    // 如果是Chrome/Edge且启用了反检测，添加额外的参数
    if ((browserType === 'chrome' || browserType === 'msedge') && antiDetection) {
      launchOptions.args = [
        ...(launchOptions.args || []),
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-component-update',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--disable-default-apps',
        '--mute-audio',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-client-side-phishing-detection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-breakpad',
        '--disable-crash-reporter',
        '--disable-ipc-flooding-protection',
        '--disable-logging',
        '--disable-hang-monitor',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-component-update',
        '--disable-background-downloads',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--disable-default-apps',
        '--disable-web-resources',
        '--disable-3d-apis',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-accelerated-video-decode',
        '--disable-app-list-dismiss-on-blur',
        '--disable-application-cache',
        '--disable-audio-output',
        '--disable-back-forward-cache',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-boot-animation',
        '--disable-breakpad',
        '--disable-checker-imaging',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-crash-reporter',
        '--disable-datasaver-prompt',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-field-trial-config',
        '--disable-gpu',
        '--disable-hang-monitor',
        '--disable-infobars',
        '--disable-ipc-flooding-protection',
        '--disable-logging',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-search-engine-choice-screen',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-gpu-blacklist',
        '--ignore-ssl-errors',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--no-sandbox',
        '--no-zygote',
        '--password-store=basic',
        "--proxy-server='direct://'",
        '--proxy-bypass-list=*',
        '--remote-debugging-port=0',
        '--safebrowsing-disable-auto-update',
        '--test-type',
        '--use-mock-keychain',
        '--window-size=1920,1080',
      ];
    }

    const context = await playwrightBrowser.launchPersistentContext(userDataDir, {
      ...launchOptions,
      viewport: config.viewport,
      userAgent: config.userAgent,
    });
    
    const browser = await context.browser();
    if (!browser) throw '打开浏览器失败';

    // 应用反检测措施
    if (antiDetection) {
      await StealthUtils.applyStealthToContext(context, config);
    }

    this.mainBrowser = browser;
    this.mainContext = context;

    return { browser, context };
  }

  public async createSession(
    browserId: string = 'default',
    browserType?: 'chrome' | 'firefox' | 'webkit' | 'msedge',
    headless?: boolean,
    antiDetection?: boolean,
    userDataDir?: string
  ): Promise<BrowserSession> {
    const config = this.configManager.getConfig();

    // 使用配置中的默认值或传入的参数
    const finalBrowserType = browserType || config.defaultBrowser;
    const finalHeadless = headless !== undefined ? headless : config.defaultHeadless;
    const finalAntiDetection = antiDetection !== undefined ? antiDetection : config.antiDetection;
    const finalUserDataDir = userDataDir || config.userDataDir;

    // 检查是否达到最大会话数
    if (this.sessions.size >= config.maxSessions) {
      // 清理最旧的会话
      const oldestSessionId = this.getOldestSessionId();
      if (oldestSessionId) {
        await this.closeSession(oldestSessionId);
      }
    }

    // 如果会话已存在，先关闭该会话的页面
    if (this.sessions.has(browserId)) {
      await this.closeSession(browserId);
    }

    // 获取或创建主浏览器
    const { browser, context } = await this.getOrCreateMainBrowser(
      finalBrowserType,
      finalHeadless,
      finalAntiDetection,
      finalUserDataDir
    );

    // 创建新页面（新标签页）
    const page = await context.newPage();
    
    // 应用反检测措施到页面
    if (finalAntiDetection) {
      await StealthUtils.applyStealthToPage(page, config);
    }

    const session: BrowserSession = {
      browser,
      context,
      page,
      createdAt: new Date(),
      lastUsed: new Date(),
      config: {
        browserType: finalBrowserType,
        headless: finalHeadless,
        antiDetection: finalAntiDetection,
        userDataDir: finalUserDataDir,
      },
    };

    this.sessions.set(browserId, session);

    // 获取反检测状态
    const stealthStatus = StealthUtils.getStealthStatus(config);

    console.log(`浏览器会话已创建: ${browserId}`, {
      browserType: finalBrowserType,
      headless: finalHeadless,
      antiDetection: finalAntiDetection,
      stealthEnabled: stealthStatus.enabled,
      stealthFeatures: stealthStatus.features.length,
      totalSessions: this.sessions.size,
    });

    return session;
  }

  public getSession(browserId: string = 'default'): BrowserSession | undefined {
    const session = this.sessions.get(browserId);
    if (session) {
      session.lastUsed = new Date();
    }
    return session;
  }

  public async closeSession(browserId: string = 'default'): Promise<boolean> {
    const session = this.sessions.get(browserId);
    if (session) {
      try {
        // 只关闭页面，不关闭浏览器
        await session.page.close();
      } catch (error) {
        console.error(`关闭浏览器会话 ${browserId} 时出错:`, error);
      }
      this.sessions.delete(browserId);
      
      // 如果这是最后一个会话，关闭浏览器
      if (this.sessions.size === 0 && this.mainBrowser) {
        try {
          await this.mainContext?.close();
          await this.mainBrowser.close();
          this.mainBrowser = null;
          this.mainContext = null;
          console.log('所有会话已关闭，浏览器已关闭');
        } catch (error) {
          console.error('关闭主浏览器时出错:', error);
        }
      }
      
      return true;
    }
    return false;
  }

  public async closeAllSessions(): Promise<void> {
    const closePromises: Promise<boolean>[] = [];
    for (const browserId of this.sessions.keys()) {
      closePromises.push(this.closeSession(browserId));
    }
    await Promise.all(closePromises);
  }

  public listSessions(): Array<{
    id: string;
    createdAt: Date;
    lastUsed: Date;
    config: BrowserSession['config'];
  }> {
    const result = [];
    for (const [id, session] of this.sessions.entries()) {
      result.push({
        id,
        createdAt: session.createdAt,
        lastUsed: session.lastUsed,
        config: session.config,
      });
    }
    return result;
  }

  private getOldestSessionId(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, session] of this.sessions.entries()) {
      if (session.createdAt.getTime() < oldestTime) {
        oldestTime = session.createdAt.getTime();
        oldestId = id;
      }
    }

    return oldestId;
  }

  private cleanupExpiredSessions(): void {
    const config = this.configManager.getConfig();
    const now = Date.now();
    const timeout = config.sessionTimeout * 60 * 1000; // 转换为毫秒

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsed.getTime() > timeout) {
        console.log(`清理过期会话: ${id}`);
        this.closeSession(id).catch((error) => {
          console.error(`清理会话 ${id} 时出错:`, error);
        });
      }
    }
  }

  public async navigateTo(browserId: string, url: string, timeout?: number): Promise<void> {
    const session = this.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在`);
    }

    const config = this.configManager.getConfig();
    const finalTimeout = timeout || config.timeout * 1000;

    await session.page.goto(url, {
      timeout: finalTimeout,
      waitUntil: 'domcontentloaded',
    });
  }

  public getConfig() {
    return this.configManager.getConfig();
  }

  public updateConfig(newConfig: Partial<any>) {
    return this.configManager.updateConfig(newConfig);
  }

  public reloadConfig() {
    return this.configManager.reloadConfig();
  }
}