import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';

const browserManager = BrowserManager.getInstance();

export const browserConfigTool: Tool = {
  definition: {
    name: 'manage_browser_config',
    description: '管理浏览器配置，包括默认浏览器、无头模式、反检测、用户数据目录等设置',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: '要执行的操作：get（获取当前配置）、update（更新配置）、reload（重新加载配置）',
          enum: ['get', 'update', 'reload'],
          default: 'get'
        },
        config: {
          type: 'object',
          description: '要更新的配置对象（仅当action为update时需要）',
          properties: {
            defaultBrowser: {
              type: 'string',
              description: '默认浏览器类型：chrome、firefox、webkit、msedge',
              enum: ['chrome', 'firefox', 'webkit', 'msedge']
            },
            defaultHeadless: {
              type: 'boolean',
              description: '是否默认以无头模式运行'
            },
            antiDetection: {
              type: 'boolean',
              description: '是否启用反检测功能'
            },
            userDataDir: {
              type: 'string',
              description: '用户数据目录路径（相对或绝对路径）'
            },
            viewport: {
              type: 'object',
              description: '视口设置',
              properties: {
                width: {
                  type: 'integer',
                  description: '视口宽度'
                },
                height: {
                  type: 'integer',
                  description: '视口高度'
                }
              }
            },
            userAgent: {
              type: 'string',
              description: '用户代理字符串'
            },
            timeout: {
              type: 'integer',
              description: '默认超时时间（秒）'
            },
            maxSessions: {
              type: 'integer',
              description: '最大会话数'
            },
            sessionTimeout: {
              type: 'integer',
              description: '会话超时时间（分钟）'
            }
          }
        }
      },
      required: ['action']

    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（管理配置）
      destructiveHint: false,   // 非破坏性操作（配置管理）
      idempotentHint: true,     // 幂等操作（相同配置产生相同结果）
      openWorldHint: false,     // 不是开放世界操作
      category: 'browser',      // 浏览器操作类别
      version: '1.0.0',        // 工具版本
      tags: ['browser', 'config', 'management', 'settings'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        action: { type: 'string', description: '执行的操作' },
        config: {
          type: 'object',
          description: '浏览器配置',
          properties: {
            defaultBrowser: { type: 'string', description: '默认浏览器类型' },
            defaultHeadless: { type: 'boolean', description: '是否无头模式' },
            antiDetection: { type: 'boolean', description: '是否启用反检测' },
            userDataDir: { type: 'string', description: '用户数据目录' },
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'integer', description: '视口宽度' },
                height: { type: 'integer', description: '视口高度' }
              }
            },
            stealthOptions: {
              type: 'object',
              properties: {
                enable: { type: 'boolean', description: '是否启用隐身模式' },
                features: { type: 'array', items: { type: 'string' }, description: '隐身功能列表' }
              }
            },
            maxSessions: { type: 'integer', description: '最大会话数' },
            sessionTimeout: { type: 'integer', description: '会话超时时间（秒）' }
          },
          required: ['defaultBrowser', 'defaultHeadless', 'antiDetection', 'maxSessions', 'sessionTimeout']
        },
        message: { type: 'string', description: '操作结果消息' },
        timestamp: { type: 'string', description: '操作时间戳' }
      },
      required: ['success', 'action', 'config', 'message', 'timestamp']
    },

    // 使用指南
    guidelines: [
      '支持三种操作：get（获取配置）、update（更新配置）、reload（重新加载配置）',
      '更新配置时只更新提供的字段，其他字段保持不变',
      '配置会持久化保存到配置文件',
      '返回完整的配置信息，包括默认值和更新后的值',
      '配置更改会影响新创建的浏览器会话'
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const action = parameters.action || 'get';
    const config = parameters.config;

    try {
      switch (action) {
        case 'get': {
          const currentConfig = browserManager.getConfig();
          const sessions = browserManager.listSessions();

          return {
            success: true,
            action: 'get',
            config: {
              defaultBrowser: currentConfig.defaultBrowser,
              defaultHeadless: currentConfig.defaultHeadless,
              antiDetection: currentConfig.antiDetection,
              userDataDir: currentConfig.userDataDir,
              viewport: currentConfig.viewport,
              userAgent: currentConfig.userAgent,
              timeout: currentConfig.timeout,
              maxSessions: currentConfig.maxSessions,
              sessionTimeout: currentConfig.sessionTimeout,

              stealthEnabled: currentConfig.stealthOptions.enable,
              stealthFeatures: currentConfig.stealthOptions.options
            },
            sessions: sessions.map(session => ({
              id: session.id,
              createdAt: session.createdAt.toISOString(),
              lastUsed: session.lastUsed.toISOString(),
              config: session.config
            })),
            sessions_count: sessions.length,
            message: '浏览器配置获取成功'
          };
        }

        case 'update': {
          if (!config || typeof config !== 'object') {
            throw new Error('config参数必须是一个有效的配置对象');
          }

          // 验证配置
          if (config.defaultBrowser && !['chrome', 'firefox', 'webkit', 'msedge'].includes(config.defaultBrowser)) {
            throw new Error('defaultBrowser必须是 chrome、firefox、webkit 或 msedge');
          }

          if (config.viewport) {
            if (typeof config.viewport.width !== 'number' || config.viewport.width <= 0) {
              throw new Error('viewport.width必须是正数');
            }
            if (typeof config.viewport.height !== 'number' || config.viewport.height <= 0) {
              throw new Error('viewport.height必须是正数');
            }
          }

          if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 5 || config.timeout > 300)) {
            throw new Error('timeout必须在5到300之间');
          }

          if (config.maxSessions && (typeof config.maxSessions !== 'number' || config.maxSessions < 1 || config.maxSessions > 20)) {
            throw new Error('maxSessions必须在1到20之间');
          }

          if (config.sessionTimeout && (typeof config.sessionTimeout !== 'number' || config.sessionTimeout < 1 || config.sessionTimeout > 240)) {
            throw new Error('sessionTimeout必须在1到240分钟之间');
          }

          // 更新配置
          browserManager.updateConfig(config);
          const updatedConfig = browserManager.getConfig();

          return {
            success: true,
            action: 'update',
            updated_config: {
              defaultBrowser: updatedConfig.defaultBrowser,
              defaultHeadless: updatedConfig.defaultHeadless,
              antiDetection: updatedConfig.antiDetection,
              userDataDir: updatedConfig.userDataDir,
              viewport: updatedConfig.viewport,
              userAgent: updatedConfig.userAgent,
              timeout: updatedConfig.timeout,
              maxSessions: updatedConfig.maxSessions,
              sessionTimeout: updatedConfig.sessionTimeout,
              stealthEnabled: updatedConfig.stealthOptions.enable
            },
            message: '浏览器配置更新成功',
            config_file: 'config/browser.yaml'
          };
        }

        case 'reload': {
          browserManager.reloadConfig();
          const reloadedConfig = browserManager.getConfig();

          return {
            success: true,
            action: 'reload',
            config: {
              defaultBrowser: reloadedConfig.defaultBrowser,
              defaultHeadless: reloadedConfig.defaultHeadless,
              antiDetection: reloadedConfig.antiDetection,
              userDataDir: reloadedConfig.userDataDir,
              viewport: reloadedConfig.viewport,
              userAgent: reloadedConfig.userAgent,
              timeout: reloadedConfig.timeout,
              maxSessions: reloadedConfig.maxSessions,
              sessionTimeout: reloadedConfig.sessionTimeout,
              stealthEnabled: reloadedConfig.stealthOptions.enable
            },
            message: '浏览器配置重新加载成功',
            config_file: 'config/browser.yaml'
          };
        }

        default:
          throw new Error(`不支持的操作: ${action}`);
      }
    } catch (error: any) {
      throw new Error(`浏览器配置管理失败: ${error.message}`);
    }
  }
};