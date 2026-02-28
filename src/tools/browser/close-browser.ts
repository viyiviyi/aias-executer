import { Tool } from '@/types/Tool';
import { BrowserManager } from '../../core/browser-manager';

const browserManager = BrowserManager.getInstance();

export const closeBrowserTool: Tool = {
  definition: {
    name: 'close_browser',
    description: 'playwright关闭浏览器',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '要关闭的浏览器ID，如果为"all"则关闭所有浏览器',
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
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（关闭浏览器）
      destructiveHint: true,    // 破坏性操作（关闭浏览器会话）
      idempotentHint: true,     // 幂等操作（多次关闭相同会话效果相同）
      openWorldHint: false,     // 不是开放世界操作
      category: 'browser',      // 浏览器操作类别
      version: '1.0.0',        // 工具版本
      tags: ['browser', 'close', 'session', 'cleanup'] // 工具标签
    },
    
    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        message: { type: 'string', description: '操作结果消息' },
        session_id: { type: 'string', description: '浏览器会话ID' },
        closed: { type: 'boolean', description: '是否成功关闭' },
        delete_data: { type: 'boolean', description: '是否删除浏览器数据' },
        remaining_sessions: { type: 'integer', description: '剩余会话数量' },
        remaining_session_ids: { 
          type: 'array', 
          items: { type: 'string' },
          description: '剩余会话ID列表'
        },
        closed_sessions: { type: 'integer', description: '关闭的会话数量（关闭所有时）' },
        force_kill: { type: 'boolean', description: '是否强制杀死进程' }
      },
      required: ['success', 'message']
    },
    
    // 使用指南
    guidelines: [
      '可以关闭单个会话或所有会话',
      '删除数据会清除cookies和localStorage',
      '强制杀死仅在所有会话关闭时有效',
      '如果会话不存在，返回成功但closed为false',
      '返回剩余会话信息以便管理'
    ],
    
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
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
              }).catch(() => {}); // 忽略错误
            }
          } catch (error) {
            console.warn(`清理浏览器数据时出错: ${error}`);
          }
        }

        const closed = await browserManager.closeSession(browserId);
        
        if (closed) {
          const remainingSessions = browserManager.listSessions();
          
          return {
            success: true,
            message: `已关闭浏览器会话: ${browserId}`,
            session_id: browserId,
            closed: true,
            delete_data: deleteData,
            remaining_sessions: remainingSessions.length,
            remaining_session_ids: remainingSessions.map(s => s.id)
          };
        } else {
          return {
            success: false,
            message: `关闭浏览器会话 ${browserId} 失败`,
            closed: false
          };
        }
      }
    } catch (error: any) {
      throw new Error(`关闭浏览器失败: ${error.message}`);
    }
  }
};