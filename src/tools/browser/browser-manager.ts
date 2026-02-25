import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: Date;
  lastUsed: Date;
}

export class BrowserManager {
  private static instance: BrowserManager;
  private sessions: Map<string, BrowserSession> = new Map();
  private maxSessions = 5; // 最大会话数限制
  private sessionTimeout = 30 * 60 * 1000; // 30分钟超时

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

  private async createBrowser(browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge' = 'chrome', headless: boolean = false): Promise<Browser> {
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

    return await playwrightBrowser.launch({
      headless,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }

  public async createSession(
    browserId: string = 'default',
    browserType: 'chrome' | 'firefox' | 'webkit' | 'msedge' = 'chrome',
    headless: boolean = false
  ): Promise<BrowserSession> {
    // 检查是否达到最大会话数
    if (this.sessions.size >= this.maxSessions) {
      // 清理最旧的会话
      const oldestSessionId = this.getOldestSessionId();
      if (oldestSessionId) {
        await this.closeSession(oldestSessionId);
      }
    }

    // 如果会话已存在，先关闭
    if (this.sessions.has(browserId)) {
      await this.closeSession(browserId);
    }

    const browser = await this.createBrowser(browserType, headless);
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const session: BrowserSession = {
      browser,
      context,
      page,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.sessions.set(browserId, session);
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
        await session.context.close();
        await session.browser.close();
      } catch (error) {
        console.error(`关闭浏览器会话 ${browserId} 时出错:`, error);
      }
      this.sessions.delete(browserId);
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

  public listSessions(): Array<{ id: string; createdAt: Date; lastUsed: Date }> {
    const result = [];
    for (const [id, session] of this.sessions.entries()) {
      result.push({
        id,
        createdAt: session.createdAt,
        lastUsed: session.lastUsed
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
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsed.getTime() > this.sessionTimeout) {
        console.log(`清理过期会话: ${id}`);
        this.closeSession(id).catch(error => {
          console.error(`清理会话 ${id} 时出错:`, error);
        });
      }
    }
  }

  public async navigateTo(browserId: string, url: string, timeout: number = 30000): Promise<void> {
    const session = this.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在`);
    }

    await session.page.goto(url, {
      timeout,
      waitUntil: 'domcontentloaded'
    });
  }
}