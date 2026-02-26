import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserConfig {
  defaultBrowser: 'chrome' | 'firefox' | 'webkit' | 'msedge';
  defaultHeadless: boolean;
  antiDetection: boolean;
  userDataDir?: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  args: string[];
  stealthOptions: {
    enable: boolean;
    options: {
      webglVendor?: string;
      renderer?: string;
      hardwareConcurrency?: number;
      deviceMemory?: number;
      screenResolution?: string;
      languages?: string[];
      platform?: string;
      plugins?: string[];
      webdriver?: boolean;
      chrome?: {
        runtime?: string;
        cdc?: boolean;
      };
    };
  };
  timeout: number;
  maxSessions: number;
  sessionTimeout: number; // 分钟
}

export class BrowserConfigManager {
  private static instance: BrowserConfigManager;
  private config: BrowserConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'browser.yaml');
    this.config = this.loadConfig();
  }

  public static getInstance(): BrowserConfigManager {
    if (!BrowserConfigManager.instance) {
      BrowserConfigManager.instance = new BrowserConfigManager();
    }
    return BrowserConfigManager.instance;
  }

  private loadConfig(): BrowserConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = yaml.load(configContent) as Partial<BrowserConfig>;
        return this.mergeWithDefaults(loadedConfig);
      } else {
        return this.createDefaultConfig();
      }
    } catch (error) {
      console.error('加载浏览器配置失败，使用默认配置:', error);
      return this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): BrowserConfig {
    const defaultConfig: BrowserConfig = {
      defaultBrowser: 'chrome',
      defaultHeadless: false,
      antiDetection: true,
      userDataDir: path.join(process.cwd(), 'browser-data'),
      viewport: {
        width: 1920,
        height: 1080
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-features=BlockInsecurePrivateNetworkRequests'
      ],
      stealthOptions: {
        enable: true,
        options: {
          webglVendor: 'Intel Inc.',
          renderer: 'Intel Iris OpenGL Engine',
          hardwareConcurrency: 8,
          deviceMemory: 8,
          screenResolution: '1920x1080',
          languages: ['zh-CN', 'zh', 'en-US', 'en'],
          platform: 'Win32',
          plugins: [
            'PDF Viewer',
            'Chrome PDF Viewer',
            'Chromium PDF Viewer',
            'Microsoft Edge PDF Viewer',
            'WebKit built-in PDF'
          ],
          webdriver: false,
          chrome: {
            runtime: '145.0.7632.6',
            cdc: false
          }
        }
      },
      timeout: 30,
      maxSessions: 30,
      sessionTimeout: 30
    };

    // 保存默认配置
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  private mergeWithDefaults(userConfig: Partial<BrowserConfig>): BrowserConfig {
    const defaultConfig = this.createDefaultConfig();
    
    return {
      defaultBrowser: userConfig.defaultBrowser || defaultConfig.defaultBrowser,
      defaultHeadless: userConfig.defaultHeadless !== undefined ? userConfig.defaultHeadless : defaultConfig.defaultHeadless,
      antiDetection: userConfig.antiDetection !== undefined ? userConfig.antiDetection : defaultConfig.antiDetection,
      userDataDir: userConfig.userDataDir || defaultConfig.userDataDir,
      viewport: userConfig.viewport || defaultConfig.viewport,
      userAgent: userConfig.userAgent || defaultConfig.userAgent,
      args: userConfig.args || defaultConfig.args,
      stealthOptions: userConfig.stealthOptions || defaultConfig.stealthOptions,
      timeout: userConfig.timeout || defaultConfig.timeout,
      maxSessions: userConfig.maxSessions || defaultConfig.maxSessions,
      sessionTimeout: userConfig.sessionTimeout || defaultConfig.sessionTimeout
    };
  }

  private saveConfig(config: BrowserConfig): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
      
      fs.writeFileSync(this.configPath, yamlContent, 'utf8');
    } catch (error) {
      console.error('保存浏览器配置失败:', error);
    }
  }

  public getConfig(): BrowserConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<BrowserConfig>): void {
    this.config = this.mergeWithDefaults(newConfig);
    this.saveConfig(this.config);
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}