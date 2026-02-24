import { Tool } from '../../core/tool-registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const interactWithPageTool: Tool = {
  definition: {
    name: 'interact_with_page',
    description: '操作浏览器，输入、点击、滚动等',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '浏览器ID（会话名称）',
          default: 'default'
        },
        action: {
          type: 'string',
          description: '要执行的操作类型',
          enum: ['click', 'type', 'fill', 'press', 'hover', 'select', 'check', 'uncheck', 'goto', 'go_back', 'go_forward', 'reload']
        },
        selector: {
          type: 'string',
          description: 'CSS选择器（对于click、type、fill、hover、select、check、uncheck操作需要）'
        },
        text: {
          type: 'string',
          description: '要输入的文本（对于type、fill操作需要）'
        },
        value: {
          type: 'string',
          description: '要选择的值（对于select操作需要）'
        },
        key: {
          type: 'string',
          description: '要按下的键（对于press操作需要），如Enter、Tab、ArrowDown等'
        },
        url: {
          type: 'string',
          description: '要导航到的URL（对于goto操作需要）'
        },
        wait_for_navigation: {
          type: 'boolean',
          description: '操作后是否等待页面导航完成',
          default: true
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 30,
          minimum: 5,
          maximum: 300
        }
      },
      required: ['action']
    },
    result_use_type: 'once'
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const action = parameters.action;
    const selector = parameters.selector;
    const text = parameters.text;
    const value = parameters.value;
    const key = parameters.key;
    const url = parameters.url;
    const waitForNavigation = parameters.wait_for_navigation !== false;
    const timeout = parameters.timeout || 30;

    try {
      let command = `playwright-cli`;
      
      // 如果有浏览器ID，添加到命令中
      if (browserId !== 'default') {
        command += ` -s=${browserId}`;
      }
      
      // 根据操作类型构建命令
      switch (action) {
        case 'click':
          if (!selector) {
            throw new Error('click操作需要selector参数');
          }
          command += ` click "${selector}"`;
          break;
          
        case 'type':
          if (!selector || !text) {
            throw new Error('type操作需要selector和text参数');
          }
          command += ` type "${selector}" "${text}"`;
          break;
          
        case 'fill':
          if (!selector || !text) {
            throw new Error('fill操作需要selector和text参数');
          }
          command += ` fill "${selector}" "${text}"`;
          break;
          
        case 'press':
          if (!key) {
            throw new Error('press操作需要key参数');
          }
          command += ` press "${key}"`;
          break;
          
        case 'hover':
          if (!selector) {
            throw new Error('hover操作需要selector参数');
          }
          command += ` hover "${selector}"`;
          break;
          
        case 'select':
          if (!selector || !value) {
            throw new Error('select操作需要selector和value参数');
          }
          command += ` select "${selector}" "${value}"`;
          break;
          
        case 'check':
          if (!selector) {
            throw new Error('check操作需要selector参数');
          }
          command += ` check "${selector}"`;
          break;
          
        case 'uncheck':
          if (!selector) {
            throw new Error('uncheck操作需要selector参数');
          }
          command += ` uncheck "${selector}"`;
          break;
          
        case 'goto':
          if (!url) {
            throw new Error('goto操作需要url参数');
          }
          command += ` goto "${url}"`;
          break;
          
        case 'go_back':
          command += ` go-back`;
          break;
          
        case 'go_forward':
          command += ` go-forward`;
          break;
          
        case 'reload':
          command += ` reload`;
          break;
          
        default:
          throw new Error(`不支持的操作类型: ${action}`);
      }

      // 执行命令
      // 执行命令，忽略stdout输出，只检查stderr
      const { stderr } = await execAsync(command, {
        cwd: process.cwd()
      });

      // 精简返回结果
      const result: any = {
        success: true,
        browser_id: browserId,
        action: action,
        message: `成功执行 ${action} 操作`
      };

      // 添加操作特定的信息
      if (selector) result.selector = selector;
      if (text) result.text = text;
      if (value) result.value = value;
      if (key) result.key = key;
      if (url) result.url = url;

      // 检查是否有错误输出
      if (stderr && stderr.trim()) {
        const errorMsg = stderr.trim();
        if (errorMsg.includes('Error') || errorMsg.includes('error')) {
          result.success = false;
          result.message = `操作执行失败: ${errorMsg}`;
        } else {
          result.warning = errorMsg;
        }
      }

      // 如果需要等待导航完成，可以获取当前页面信息
      if (waitForNavigation && (action === 'click' || action === 'goto' || action === 'go_back' || action === 'go_forward' || action === 'reload')) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒让页面加载
          
          const infoCommand = browserId !== 'default' 
            ? `playwright-cli -s=${browserId} eval "window.location.href"`
            : `playwright-cli eval "window.location.href"`;
            
          const { stdout: urlStdout } = await execAsync(infoCommand, {
            timeout: 10 * 1000,
            cwd: process.cwd()
          });
          
          result.current_url = urlStdout.trim();
          
          const titleCommand = browserId !== 'default' 
            ? `playwright-cli -s=${browserId} eval "document.title"`
            : `playwright-cli eval "document.title"`;
            
          const { stdout: titleStdout } = await execAsync(titleCommand, {
            timeout: 10 * 1000,
            cwd: process.cwd()
          });
          
          result.current_title = titleStdout.trim();
        } catch (infoError) {
          result.info_error = `获取页面信息失败: ${infoError instanceof Error ? infoError.message : String(infoError)}`;
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
      
      throw new Error(`页面交互操作失败: ${error.message}`);
    }
  }
};