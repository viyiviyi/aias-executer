import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const browserManager = BrowserManager.getInstance();

export const downloadFileTool: Tool = {
  definition: {
    name: 'download_file',
    description: '从浏览器下载文件，支持配置下载目录和自动移动文件',
    parameters: {
      type: 'object',
      properties: {
        browser_id: {
          type: 'string',
          description: '浏览器ID（会话名称）',
          default: 'default',
        },
        url: {
          type: 'string',
          description: '要下载的文件URL',
        },
        selector: {
          type: 'string',
          description: 'CSS选择器，用于点击触发下载的元素（可选）',
        },
        target_directory: {
          type: 'string',
          description: '目标目录，下载的文件将移动到此目录（可选，默认为工作目录）',
          default: '.',
        },
        filename: {
          type: 'string',
          description: '自定义文件名（可选，不指定则使用原始文件名）',
        },
        timeout: {
          type: 'integer',
          description: '超时时间（秒）',
          default: 60,
          minimum: 10,
          maximum: 300,
        },
      },
      required: ['url'],
    },
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const url = parameters.url;
    const selector = parameters.selector;
    const targetDirectory = parameters.target_directory || '.';
    const customFilename = parameters.filename;
    const timeout = parameters.timeout || 60;

    if (!url) {
      throw new Error('url参数不能为空');
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`无效的URL格式: ${url}`);
    }

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在，请先使用 open_browser 打开浏览器`);
    }

    const page = session.page;
    let downloadPath: string | null = null;
    let originalFilename: string | null = null;

    try {
      // 设置下载监听器
      const downloadPromise = new Promise<{ path: string; suggestedFilename: string }>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`下载超时 (${timeout}秒)`));
        }, timeout * 1000);

        // 监听下载事件
        const handleDownload = async (download: any) => {
          clearTimeout(timeoutId);
          
          try {
            // 获取建议的文件名
            const suggestedFilename = download.suggestedFilename();
            
            // 创建临时下载目录
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-downloads-'));
            
            // 设置下载路径
            const tempFilePath = path.join(tempDir, suggestedFilename);
            
            // 保存下载
            await download.saveAs(tempFilePath);
            
            // 移除监听器，避免重复处理
            page.off('download', handleDownload);
            
            resolve({
              path: tempFilePath,
              suggestedFilename: suggestedFilename
            });
          } catch (error: any) {
            // 移除监听器
            page.off('download', handleDownload);
            reject(new Error(`下载失败: ${error.message}`));
          }
        };
        
        // 注册下载监听器
        page.on('download', handleDownload);
      });

      // 导航到URL或点击元素触发下载
      if (selector) {
        // 如果提供了选择器，先导航到页面然后点击元素
        await browserManager.navigateTo(browserId, url, timeout * 1000);
        await page.click(selector, { timeout: timeout * 1000 });
      } else {
        // 创建一个简单的HTML页面，包含下载链接
        const filename = customFilename || url.split('/').pop() || 'download';
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Download File</title>
          </head>
          <body>
            <a id="download-link" href="${url}" download="${filename}" style="display:none;">Download</a>
            <script>
              // 自动点击下载链接
              document.getElementById('download-link').click();
              // 等待一段时间确保点击生效
              setTimeout(() => {
                document.body.innerHTML = '<p>Download started...</p>';
              }, 100);
            </script>
          </body>
          </html>
        `;
        
        // 设置页面内容
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        
        // 等待下载开始
        await page.waitForTimeout(2000);
      }

      // 等待下载完成
      const downloadResult = await downloadPromise;
      downloadPath = downloadResult.path;
      originalFilename = downloadResult.suggestedFilename;

      // 确定最终文件名
      const finalFilename = customFilename || originalFilename;
      
      // 确保目标目录存在
      const fullTargetDir = path.isAbsolute(targetDirectory) 
        ? targetDirectory 
        : path.join(process.cwd(), targetDirectory);
      
      if (!fs.existsSync(fullTargetDir)) {
        fs.mkdirSync(fullTargetDir, { recursive: true });
      }

      // 目标文件路径
      const targetFilePath = path.join(fullTargetDir, finalFilename);
      
      // 移动文件到目标目录
      fs.renameSync(downloadPath, targetFilePath);
      
      // 清理临时目录
      const tempDir = path.dirname(downloadPath);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // 获取文件信息
      const fileStats = fs.statSync(targetFilePath);
      
      return {
        success: true,
        session_id: browserId,
        download_info: {
          original_url: url,
          original_filename: originalFilename,
          saved_filename: finalFilename,
          target_directory: fullTargetDir,
          file_path: targetFilePath,
          file_size: fileStats.size,
          file_size_human: formatFileSize(fileStats.size),
          created_at: new Date().toISOString(),
        },
        message: `文件下载成功: ${finalFilename} (${formatFileSize(fileStats.size)})`,
      };
    } catch (error: any) {
      // 清理临时文件
      if (downloadPath && fs.existsSync(downloadPath)) {
        const tempDir = path.dirname(downloadPath);
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          // 忽略清理错误
        }
      }
      
      throw new Error(`下载文件失败: ${error.message}`);
    }
  },
};

// 辅助函数：格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}