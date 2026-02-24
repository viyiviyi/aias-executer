import { Tool } from '../../core/tool-registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const getPageContentTool: Tool = {
  definition: {
    name: 'get_page_content',
    description: '读取页面快照（获取完整的页面内容）',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '浏览器ID（会话名称）',
          default: 'default'
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
    result_use_type: 'last'
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;

    try {
      let command = `playwright-cli`;
      
      // 如果有浏览器ID，添加到命令中
      if (browserId !== 'default') {
        command += ` -s=${browserId}`;
      }
      
      // 直接获取页面快照
      command += ` snapshot`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeout * 1000,
        cwd: process.cwd()
      });
      
      // 解析快照输出
      const snapshotMatch = stdout.match(/\[Snapshot\]\((.+)\)/);
      let result: any = {
        success: true,
        browser_id: browserId
      };
      
      if (snapshotMatch) {
        const snapshotFile = snapshotMatch[1];
        result.snapshot_file = snapshotFile;
        
        // 尝试读取快照文件内容
        try {
          const fs = require('fs');
          const path = require('path');
          const snapshotPath = path.join(process.cwd(), snapshotFile);
          
          if (fs.existsSync(snapshotPath)) {
            const snapshotContent = fs.readFileSync(snapshotPath, 'utf-8');
            result.content = snapshotContent;
            
            // 解析快照内容获取页面信息
            const pageUrlMatch = snapshotContent.match(/Page URL: (.+)/);
            const pageTitleMatch = snapshotContent.match(/Page Title: (.+)/);
            
            if (pageUrlMatch) result.page_url = pageUrlMatch[1].trim();
            if (pageTitleMatch) result.page_title = pageTitleMatch[1].trim();
          }
        } catch (readError) {
          result.snapshot_read_error = `无法读取快照文件: ${readError instanceof Error ? readError.message : String(readError)}`;
        }
      }
      
      if (stderr && stderr.trim()) {
        result.warning = stderr.trim();
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
      
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  }
};