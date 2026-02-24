import { Tool } from '../../core/tool-registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const closeBrowserTool: Tool = {
  definition: {
    name: 'close_browser',
    description: '关闭浏览器',
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
    result_use_type: 'once'
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const deleteData = parameters.delete_data || false;
    const forceKill = parameters.force_kill || false;
    const timeout = parameters.timeout || 30;

    try {
      let command = `playwright-cli`;
      let result: any = {
        success: true
      };

      if (browserId === 'all') {
        // 关闭所有浏览器
        if (forceKill) {
          command += ` kill-all`;
          result.action = 'kill_all_browsers';
          result.message = '强制杀死所有浏览器进程';
        } else {
          command += ` close-all`;
          result.action = 'close_all_browsers';
          result.message = '关闭所有浏览器';
        }
      } else {
        // 关闭指定浏览器
        if (browserId !== 'default') {
          command += ` -s=${browserId}`;
          result.browser_id = browserId;
        }
        
        if (deleteData) {
          command += ` delete-data`;
          result.action = 'delete_browser_data';
          result.message = `删除浏览器 ${browserId} 的数据`;
        } else {
          command += ` close`;
          result.action = 'close_browser';
          result.message = `关闭浏览器 ${browserId}`;
        }
      }

      // 执行命令
      // 执行命令，忽略stdout输出，只检查stderr
      const { stderr } = await execAsync(command, {
        cwd: process.cwd()
      });

      // 检查是否有错误输出
      if (stderr && stderr.trim()) {
        const errorMsg = stderr.trim();
        if (errorMsg.includes('Error') || errorMsg.includes('error') || errorMsg.includes('not found')) {
          result.success = false;
          result.message = `关闭浏览器失败: ${errorMsg}`;
        } else {
          result.warning = errorMsg;
        }
      }

      return result;

    } catch (error: any) {
      // 处理执行错误
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`命令执行超时（${timeout}秒）`);
      }
      
      if (error.stderr) {
        throw new Error(`playwright-cli执行错误: ${error.stderr}`);
      }
      
      throw new Error(`关闭浏览器失败: ${error.message}`);
    }
  }
};