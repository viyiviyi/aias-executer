import { Tool } from '@/types/tools/Tool';
import { BrowserManager } from '../../core/browser/browser-manager';

const browserManager = BrowserManager.getInstance();

export const closeBrowserTool: Tool = {
  definition: {
    name: 'close_browser',
    groupName: 'browser',
    description: '关闭浏览器标签页',
    parameters: {
      type: 'object',
      properties: {
        tab_id: {
          type: 'string',
          description: '要关闭的标签页ID，如果为"all"则关闭所有标签页',
          default: 'default'
        },
        delete_data: {
          type: 'boolean',
          description: '是否删除浏览器数据（如cookies、localStorage等）',
          default: false
        },
        force_kill: {
          type: 'boolean',
          description: '是否强制杀死浏览器进程（仅当browser_id为"all"时有效）',
          default: false
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300
        }
      },
      required: []
    },
    // 使用指南
    guidelines: [
      '可以关闭单个标签页或所有标签页',
      '删除数据会清除cookies和localStorage',
      '强制杀死仅在所有会标签页关闭时有效',
      '如果标签页不存在，返回成功但closed为false',
      '返回剩余标签页信息以便管理'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.tab_id || 'default';
    const deleteData = parameters.delete_data || false;
    const forceKill = parameters.force_kill || false;
    try {
      if (browserId === 'all') {
        // 关闭所有浏览器会话
        const sessionsBefore = browserManager.listSessions();
        const sessionCount = sessionsBefore.length;

        if (sessionCount === 0) {
          return {
            success: true,
            message: '没有活动的浏览器会话需要关闭',
            closed_sessions: 0,
            remaining_sessions: 0
          };
        }

        await browserManager.closeAllSessions();

        const sessionsAfter = browserManager.listSessions();

        return {
          success: true,
          message: `已关闭所有浏览器会话（共 ${sessionCount} 个）`,
          closed_sessions: sessionCount,
          remaining_sessions: sessionsAfter.length,
          force_kill: forceKill,
          delete_data: deleteData
        };
      } else {
        // 关闭指定浏览器会话
        const session = browserManager.getSession(browserId);
        if (!session) {
          return {
            success: false,
            message: `浏览器会话 ${browserId} 不存在`,
            closed: false
          };
        }

        // 如果设置了删除数据，先清理上下文
        if (deleteData && session.context) {
          try {
            await session.context.clearCookies();
            // 注意：Playwright没有直接的localStorage清理API，可以通过页面执行脚本
            const pages = session.context.pages();
            for (const page of pages) {
              await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
              }).catch(() => { }); // 忽略错误
            }
          } catch (error) {
            console.warn(`清理浏览器数据时出错: ${error}`);
          }
        }

        const closed = await browserManager.closeSession(browserId);

        // 获取所有标签页信息（使用浏览器管理器中注册的真实标签页ID）
        const allSessions = browserManager.listSessions();
        const tabsInfo = allSessions.map((s) => ({
          tab_id: s.id,
          url: s.page.url(),
          // is_active: s.id === tabId,
        }));
        if (closed) {
          return {
            success: true,
            message: `已关闭浏览器会话: ${browserId}`,
            tab_id: browserId,
            closed: true,
            delete_data: deleteData,
            remaining_tabsInfo: tabsInfo
          };
        } else {
          return {
            success: false,
            message: `关闭浏览器会话 ${browserId} 失败`,
            closed: false,
            remaining_tabsInfo: tabsInfo
          };
        }
      }
    } catch (error: any) {
      throw new Error(`关闭浏览器失败: ${error.message}`);
    }
  }
};