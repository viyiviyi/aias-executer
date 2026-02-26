import { BrowserContext, Page } from 'playwright';
import { BrowserConfig } from './browser-config';

export class StealthUtils {
  /**
   * 应用反检测措施到浏览器上下文
   */
  static async applyStealthToContext(context: BrowserContext, config: BrowserConfig): Promise<void> {
    if (!config.antiDetection || !config.stealthOptions.enable) {
      return;
    }

    const options = config.stealthOptions.options;

    // 设置用户代理
    await context.setExtraHTTPHeaders({
      'Accept-Language': options.languages?.join(',') || 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': config.userAgent
    });

    // 注入反检测脚本
    await context.addInitScript(`
      // 删除webdriver属性 - 只在未定义时定义
      if (!Object.getOwnPropertyDescriptor(navigator, 'webdriver')) {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      }

      // 修改plugins属性
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // 修改languages属性
      Object.defineProperty(navigator, 'languages', {
        get: () => ${JSON.stringify(options.languages || ['zh-CN', 'zh', 'en-US', 'en'])}
      });

      // 修改platform属性
      Object.defineProperty(navigator, 'platform', {
        get: () => ${JSON.stringify(options.platform || 'Win32')}
      });

      // 修改hardwareConcurrency属性
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${options.hardwareConcurrency || 8}
      });

      // 修改deviceMemory属性
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${options.deviceMemory || 8}
      });

      // 删除chrome对象中的cdc属性
      if (window.chrome) {
        delete window.chrome.cdc;
      }

      // 覆盖webgl属性
      if (WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter) {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return ${JSON.stringify(options.webglVendor || 'Intel Inc.')};
          }
          if (parameter === 37446) {
            return ${JSON.stringify(options.renderer || 'Intel Iris OpenGL Engine')};
          }
          return getParameter.call(this, parameter);
        };
      }

      // 覆盖屏幕分辨率
      Object.defineProperty(window.screen, 'width', {
        get: () => 1920
      });
      Object.defineProperty(window.screen, 'height', {
        get: () => 1080
      });
      Object.defineProperty(window.screen, 'availWidth', {
        get: () => 1920
      });
      Object.defineProperty(window.screen, 'availHeight', {
        get: () => 1040
      });
      Object.defineProperty(window.screen, 'colorDepth', {
        get: () => 24
      });
      Object.defineProperty(window.screen, 'pixelDepth', {
        get: () => 24
      });

      // 覆盖时区
      if (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat.prototype.resolvedOptions) {
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
          get: function() {
            const original = this.__proto__.__proto__.resolvedOptions.call(this);
            return {
              ...original,
              timeZone: 'Asia/Shanghai'
            };
          }
        });
      }

      // 覆盖canvas指纹
      if (HTMLCanvasElement && HTMLCanvasElement.prototype.getContext) {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
          const context = originalGetContext.call(this, contextType, contextAttributes);
          if (contextType === '2d') {
            const originalFillText = context.fillText;
            context.fillText = function(...args) {
              args[0] = args[0] + ' ';
              return originalFillText.apply(this, args);
            };
          }
          return context;
        };
      // 覆盖音频指纹
      if (AudioContext && AudioContext.prototype.createOscillator) {
        const originalCreateOscillator = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function() {
          const oscillator = originalCreateOscillator.call(this);
          const originalFrequency = oscillator.frequency;
          Object.defineProperty(oscillator.frequency, 'value', {
            get: function() {
              return originalFrequency.value + 0.0001;
            }
          });
          return oscillator;
        };
      }

      // 覆盖字体指纹
      if (CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.measureText) {
        const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
          const metrics = originalMeasureText.call(this, text);
          metrics.width = metrics.width + 0.01;
          return metrics;
        };
      }
        return metrics;
      };

      // 覆盖WebRTC
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
          return Promise.reject(new Error('NotAllowedError'));
        };
      }

      // 覆盖电池API
      if (navigator.getBattery) {
        navigator.getBattery = function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
          });
        };
      }

      // 覆盖连接API
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'downlink', {
          get: () => 10
        });
      // 覆盖通知API
      if (typeof Notification !== 'undefined' && Notification.permission) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'denied'
        });
      }
        });
      }

      // 覆盖权限API
      const originalQuery = navigator.permissions.query;
      if (originalQuery) {
        navigator.permissions.query = function(permissionDesc) {
          return Promise.resolve({
            state: 'denied',
            onchange: null
          });
        };
      }

      // 覆盖通知API
      if (Notification && Notification.permission) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'denied'
        });
      }

      // 覆盖地理位置API
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          if (error) {
            error({
              code: 1,
              message: 'User denied Geolocation'
            });
          }
        };
      }

      // 覆盖存储API
      Object.defineProperty(navigator, 'storage', {
        get: () => ({
          estimate: () => Promise.resolve({
            quota: 1000000000,
            usage: 10000000,
            usageDetails: {}
          }),
          persist: () => Promise.resolve(true),
          persisted: () => Promise.resolve(true)
        })
      });

      // 覆盖性能API
      if (performance && performance.now) {
        const originalNow = performance.now;
        performance.now = function() {
          return originalNow.call(this) + Math.random() * 10;
        };
      }

      // 覆盖时间API
      if (Date && Date.now) {
        const originalDateNow = Date.now;
        Date.now = function() {
          return originalDateNow.call(this) + Math.random() * 100;
        };
      }

      // 覆盖Math.random
      if (Math && Math.random) {
        const originalRandom = Math.random;
        Math.random = function() {
          return originalRandom.call(this) + 0.0000000001;
        };
      }

      console.log('反检测脚本已注入');
    `);
  }

  /**
   * 应用反检测措施到页面
   */
  static async applyStealthToPage(page: Page, config: BrowserConfig): Promise<void> {
    if (!config.antiDetection || !config.stealthOptions.enable) {
      return;
    }

    // 设置视口
    await page.setViewportSize(config.viewport);

    // 设置额外的HTTP头
    const options = config.stealthOptions.options;
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': options.languages?.join(',') || 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': config.userAgent
    });

    // 覆盖navigator属性
    await page.addInitScript((options: any) => {
      // 删除自动化标志 - 只在未定义时定义
      if (!Object.getOwnPropertyDescriptor(navigator, 'webdriver')) {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false
        });
      }

      // 覆盖chrome运行时
      const win = window as any;
      if (win.chrome && options.chrome) {
        if (options.chrome.runtime) {
          Object.defineProperty(win.chrome, 'runtime', {
            get: () => ({
              id: undefined,
              getManifest: () => ({}),
              getURL: (path: string) => `chrome-extension://${path}`,
              sendMessage: () => Promise.resolve({}),
              onMessage: { addListener: () => {} }
            })
          });
        }
      }
    }, options);

    // 添加随机延迟
    await page.waitForTimeout(Math.random() * 1000);
  }

  /**
   * 获取反检测状态
   */
  static getStealthStatus(config: BrowserConfig): {
    enabled: boolean;
    features: string[];
  } {
    if (!config.antiDetection || !config.stealthOptions.enable) {
      return {
        enabled: false,
        features: []
      };
    }

    const features = [
      'webdriver属性隐藏',
      '用户代理伪装',
      'WebGL指纹修改',
      'Canvas指纹修改',
      '音频指纹修改',
      '字体指纹修改',
      '屏幕分辨率修改',
      '硬件信息修改',
      '插件列表修改',
      '语言设置修改',
      '时区修改',
      'WebRTC屏蔽',
      '电池API伪装',
      '连接信息伪装',
      '权限API伪装',
      '通知API伪装',
      '地理位置屏蔽',
      '存储API伪装',
      '性能API修改',
      '时间API修改',
      '随机数修改'
    ];

    return {
      enabled: true,
      features
    };
  }
}