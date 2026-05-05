import {
  Browser,
  BrowserContext,
  LaunchOptions,
  Page,
  chromium,
  firefox,
  webkit,
} from 'playwright';
import { BrowserConfigManager } from './browser-config';
import { StealthUtils } from '../utils/stealth-utils';
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

  // 重连相关属性
  // private isReconnecting: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // 设置Playwright浏览器安装路径到项目目录
    // 这样无论是普通模式还是服务模式都能使用同一个浏览器
    const browsersPath = path.join(process.cwd(), 'playwright-browsers');
    if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
      console.log(`设置PLAYWRIGHT_BROWSERS_PATH环境变量: ${browsersPath}`);
    }
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * 检查浏览器连接状态
   */
  private async checkBrowserHealth(): Promise<boolean> {
    if (!this.mainBrowser) return false;

    // 添加重试机制，最多重试2次
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // 尝试执行一个简单的操作来检查连接状态
        const version = await this.mainBrowser.version();
        return !!version;
      } catch (error) {
        if (attempt === 2) {
          // 最后一次尝试也失败
          console.warn(`浏览器健康检查失败 (尝试 ${attempt}/2):`, error);
          return false;
        }
        // 第一次失败，等待一小段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return false;
  }

  /**
   * 清理已断开连接的浏览器实例
   */
  private async cleanupDisconnectedBrowser(): Promise<void> {
    try {
      if (this.mainContext) {
        await this.mainContext.close().catch(() => {});
      }
      if (this.mainBrowser) {
        await this.mainBrowser.close().catch(() => {});
      }
    } catch (error) {
      console.warn('清理断开连接的浏览器时出错:', error);
    } finally {
      this.mainBrowser = null;
      this.mainContext = null;

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
    }
  }

  /**
   * 设置浏览器事件监听器
   */
  private setupBrowserEventListeners(browser: Browser): void {
    // 监听disconnected事件
    browser.on('disconnected', () => {
      console.log('浏览器断开连接事件触发');
      // this.handleBrowserDisconnection();
    });

    // 启动定期健康检查（每30秒）
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('健康检查失败:', error);
      });
    }, 30000);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.mainBrowser || this.sessions.size === 0) {
      return;
    }

    const isHealthy = await this.checkBrowserHealth();
    if (!isHealthy) {
      console.warn('健康检查发现浏览器可能不健康，将在下次操作时处理...');
      // 不立即处理，避免中断正在进行的操作
      // 设置浏览器为null，让下次getOrCreateMainBrowser时重新创建
      this.mainBrowser = null;
      this.mainContext = null;

      // 清理健康检查定时器
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
    }
  }

  private async getOrCreateMainBrowser(
    browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge',
    headless: boolean,
    antiDetection: boolean,
    userDataDir?: string
  ): Promise<{ browser: Browser; context: BrowserContext }> {
    // 如果主浏览器已存在且健康，直接返回
    if (this.mainBrowser && this.mainContext) {
      const isHealthy = await this.checkBrowserHealth();
      if (isHealthy) {
        return { browser: this.mainBrowser, context: this.mainContext };
      } else {
        // 浏览器不健康，标记为需要重新创建，但不立即清理避免中断操作
        console.warn('浏览器健康检查失败，标记为需要重新创建...');
        this.mainBrowser = null;
        this.mainContext = null;

        // 异步清理旧的浏览器实例（不阻塞当前操作）
        this.cleanupDisconnectedBrowser().catch(error => {
          console.warn('异步清理浏览器时出错:', error);
        });
      }
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
      executablePath: path.join(process.cwd(), 'playwright-browsers', 'chromium-1208', 'chrome-win64', 'chrome.exe')
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
        // '--disable-blink-features=AutomationControlled',
        // '--disable-features=IsolateOrigins,site-per-process',
        // '--disable-web-security',
        // '--disable-site-isolation-trials',
        // '--disable-features=BlockInsecurePrivateNetworkRequests',
        // '--disable-component-update',
        // '--disable-background-networking',
        // '--disable-sync',
        // '--metrics-recording-only',
        // '--disable-default-apps',
        // '--mute-audio',
        // '--no-first-run',
        // '--disable-background-timer-throttling',
        // '--disable-backgrounding-occluded-windows',
        // '--disable-renderer-backgrounding',
        // '--disable-client-side-phishing-detection',
        // '--disable-popup-blocking',
        // '--disable-prompt-on-repost',
        // '--disable-domain-reliability',
        // '--disable-breakpad',
        // '--disable-crash-reporter',
        // '--disable-ipc-flooding-protection',
        // '--disable-logging',
        // '--disable-hang-monitor',
        // '--disable-extensions',
        // '--disable-component-extensions-with-background-pages',
        // '--disable-component-update',
        // '--disable-background-downloads',
        // '--disable-background-networking',
        // '--disable-sync',
        // '--disable-translate',
        // '--disable-default-apps',
        // '--disable-web-resources',
        // '--disable-3d-apis',
        // '--disable-accelerated-2d-canvas',
        // '--disable-accelerated-jpeg-decoding',
        // '--disable-accelerated-mjpeg-decode',
        // '--disable-accelerated-video-decode',
        // '--disable-app-list-dismiss-on-blur',
        // '--disable-application-cache',
        // '--disable-audio-output',
        // '--disable-back-forward-cache',
        // '--disable-background-timer-throttling',
        // '--disable-backgrounding-occluded-windows',
        // '--disable-boot-animation',
        // '--disable-breakpad',
        // '--disable-checker-imaging',
        // '--disable-client-side-phishing-detection',
        // '--disable-component-update',
        // '--disable-crash-reporter',
        // '--disable-datasaver-prompt',
        // '--disable-default-apps',
        // '--disable-dev-shm-usage',
        // '--disable-domain-reliability',
        // '--disable-extensions',
        // '--disable-features=TranslateUI',
        // '--disable-field-trial-config',
        // '--disable-gpu',
        // '--disable-hang-monitor',
        // '--disable-infobars',
        // '--disable-ipc-flooding-protection',
        // '--disable-logging',
        // '--disable-notifications',
        // '--disable-popup-blocking',
        // '--disable-prompt-on-repost',
        // '--disable-renderer-backgrounding',
        // '--disable-search-engine-choice-screen',
        // '--disable-sync',
        // '--disable-translate',
        // '--hide-scrollbars',
        // '--ignore-certificate-errors',
        // '--ignore-certificate-errors-spki-list',
        // '--ignore-gpu-blacklist',
        // '--ignore-ssl-errors',
        // '--no-default-browser-check',
        // '--no-first-run',
        // '--no-pings',
        // '--no-sandbox',
        // '--no-zygote',
        // '--password-store=basic',
        // "--proxy-server='direct://'",
        // '--proxy-bypass-list=*',
        // '--remote-debugging-port=0',
        // '--safebrowsing-disable-auto-update',
        // '--test-type',
        // '--use-mock-keychain',
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

    // 设置事件监听器
    this.setupBrowserEventListeners(browser);

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

  public async registerNewTab(
    originalBrowserId: string,
    newPage: Page,
    newBrowserId?: string
  ): Promise<string> {
    const originalSession = this.getSession(originalBrowserId);
    if (!originalSession) {
      throw new Error(`原始浏览器会话 ${originalBrowserId} 不存在`);
    }

    // 生成新的浏览器ID
    const finalNewBrowserId = newBrowserId || `tab${Date.now()}`;

    // 检查是否达到最大会话数
    const config = this.configManager.getConfig();
    if (this.sessions.size >= config.maxSessions) {
      // 清理最旧的会话
      const oldestSessionId = this.getOldestSessionId();
      if (oldestSessionId) {
        await this.closeSession(oldestSessionId);
      }
    }

    // 如果新会话ID已存在，先关闭
    if (this.sessions.has(finalNewBrowserId)) {
      await this.closeSession(finalNewBrowserId);
    }

    const session: BrowserSession = {
      browser: originalSession.browser,
      context: originalSession.context,
      page: newPage,
      createdAt: new Date(),
      lastUsed: new Date(),
      config: originalSession.config,
    };

    this.sessions.set(finalNewBrowserId, session);

    // 应用反检测措施到新页面
    if (originalSession.config.antiDetection) {
      const config = this.configManager.getConfig();
      await StealthUtils.applyStealthToPage(newPage, config);
    }

    console.log(`新标签页已注册: ${finalNewBrowserId}`, {
      originalSession: originalBrowserId,
      totalSessions: this.sessions.size,
    });

    return finalNewBrowserId;
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

          // 清理健康检查定时器
          if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
          }

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
    page: Page;
    config: BrowserSession['config'];
  }> {
    const result = [];
    for (const [id, session] of this.sessions.entries()) {
      result.push({
        id,
        createdAt: session.createdAt,
        lastUsed: session.lastUsed,
        page: session.page,
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
    let session = this.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在`);
    }

    const config = this.configManager.getConfig();
    const finalTimeout = timeout || config.timeout * 1000;

    // 检查页面是否仍然有效，如果浏览器被手动关闭则需要重新创建会话
    try {
      // 通过尝试获取页面标题来检查页面是否有效
      await session.page.title();
    } catch (error: any) {
      // 页面已失效（浏览器可能被手动关闭），需要重新创建会话
      console.warn(`浏览器会话 ${browserId} 的页面已失效，将重新创建会话...`);

      // 先清理失效的会话
      await this.closeSession(browserId).catch(() => {});

      // 重新创建会话
      session = await this.createSession(
        browserId,
        session.config.browserType,
        session.config.headless,
        session.config.antiDetection,
        session.config.userDataDir
      );
    }

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