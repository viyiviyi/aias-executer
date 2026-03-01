import { ConfigManager } from './../../core/config';
import { BrowserManager } from '../../core/browser/browser-manager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Tool } from '@/types';

const browserManager = BrowserManager.getInstance();
const configManager = ConfigManager.getInstance();

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
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（下载文件）
      destructiveHint: false,   // 非破坏性操作
      idempotentHint: false,    // 非幂等操作（多次下载可能产生不同结果）
      openWorldHint: true,      // 开放世界操作（从外部网站下载）
      category: 'browser',      // 浏览器操作类别
      version: '1.0.0',        // 工具版本
      tags: ['browser', 'download', 'file', 'resource'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        session_id: { type: 'string', description: '浏览器会话ID' },
        download_info: {
          type: 'object',
          properties: {
            original_url: { type: 'string', description: '原始URL' },
            original_filename: { type: 'string', description: '原始文件名' },
            saved_filename: { type: 'string', description: '保存的文件名' },
            target_directory: { type: 'string', description: '目标目录' },
            file_path: { type: 'string', description: '文件完整路径' },
            file_size: { type: 'integer', description: '文件大小（字节）' },
            file_size_human: { type: 'string', description: '文件大小（人类可读）' },
            created_at: { type: 'string', description: '创建时间' }
          },
          required: ['original_url', 'original_filename', 'saved_filename', 'target_directory', 'file_path', 'file_size', 'file_size_human', 'created_at']
        },
        message: { type: 'string', description: '操作结果消息' }
      },
      required: ['success', 'session_id', 'download_info', 'message']
    },

    // 使用指南
    guidelines: [
      '可以直接下载文件或通过点击页面元素触发下载',
      '可以指定目标目录和自定义文件名',
      '会自动创建不存在的目录',
      '支持大文件下载，默认超时60秒',
      '返回详细的下载信息和文件统计'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const url = parameters.url;
    const selector = parameters.selector;
    const targetDirectory = parameters.target_directory || '.';
    const customFilename = parameters.filename;
    const timeout = parameters.timeout || 60;
    const config = configManager.getConfig();
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
    const page = await session.browser.newPage();
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
            const suggestedFilename = (Date.now() + customFilename) || (Date.now() + '.tmp');

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
        await page.waitForTimeout(20000);
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
        : path.join(process.cwd(), config.workspaceDir, targetDirectory);

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
      page.close();
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