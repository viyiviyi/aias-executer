import { Tool } from '../../core/tool-registry';
import { BrowserManager } from './browser-manager';

const browserManager = BrowserManager.getInstance();

export const getPageContentTool: Tool = {
  definition: {
    name: 'get_page_content',
    description: 'playwright读取页面快照（获取完整的页面内容）',
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
    }
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const browserId = parameters.browser_id || 'default';
    const timeout = parameters.timeout || 30;

    const session = browserManager.getSession(browserId);
    if (!session) {
      throw new Error(`浏览器会话 ${browserId} 不存在，请先使用 open_browser 打开浏览器`);
    }

    try {
      const page = session.page;
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle', { timeout: timeout * 1000 });
      
      // 获取页面基本信息
      const title = await page.title();
      const url = page.url();
      
      // 获取页面HTML内容
      const htmlContent = await page.content();
      
      // 获取页面文本内容（去除HTML标签）
      const textContent = await page.evaluate(() => {
        const body = document.body;
        return body?.innerText || body?.textContent || '';
      });
      
      // 获取页面截图（base64编码）
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 70,
        fullPage: false
      });
      const screenshotBase64 = screenshotBuffer.toString('base64');
      
      // 获取页面元数据
      const metaData = await page.evaluate(() => {
        const metas = document.querySelectorAll('meta');
        const metaInfo: Record<string, string> = {};
        metas.forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          if (name && content) {
            metaInfo[name] = content;
          }
        });
        return metaInfo;
      });
      
      // 获取所有链接
      const links = await page.evaluate(() => {
        const linkElements = document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(link => ({
          text: link.textContent?.trim() || '',
          href: link.getAttribute('href') || '',
          title: link.getAttribute('title') || ''
        })).filter(link => link.href);
      });
      
      // 获取页面结构信息
      const structure = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return {
          h1: Array.from(headings).filter(h => h.tagName === 'H1').map(h => h.textContent?.trim() || ''),
          h2: Array.from(headings).filter(h => h.tagName === 'H2').map(h => h.textContent?.trim() || ''),
          h3: Array.from(headings).filter(h => h.tagName === 'H3').map(h => h.textContent?.trim() || ''),
          total_headings: headings.length
        };
      });

      // 获取页面元素统计
      const totalImages = await page.evaluate(() => document.querySelectorAll('img').length);
      const totalForms = await page.evaluate(() => document.querySelectorAll('form').length);
      const totalScripts = await page.evaluate(() => document.querySelectorAll('script').length);
      const totalStyles = await page.evaluate(() => document.querySelectorAll('style, link[rel="stylesheet"]').length);

      return {
        success: true,
        session_id: browserId,
        page_info: {
          title: title,
          url: url,
          html_content_length: htmlContent.length,
          text_content_length: textContent.length,
          screenshot: `data:image/jpeg;base64,${screenshotBase64}`,
          meta_data: metaData,
          links_count: links.length,
          structure: structure
        },
        content_preview: {
          html_preview: htmlContent.substring(0, 5000) + (htmlContent.length > 5000 ? '...' : ''),
          text_preview: textContent.substring(0, 2000) + (textContent.length > 2000 ? '...' : ''),
          links_preview: links.slice(0, 10)
        },
        statistics: {
          total_characters: htmlContent.length,
          total_words: textContent.split(/\s+/).filter(word => word.length > 0).length,
          total_links: links.length,
          total_images: totalImages,
          total_forms: totalForms,
          total_scripts: totalScripts,
          total_styles: totalStyles
        }
      };
    } catch (error: any) {
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  }
};