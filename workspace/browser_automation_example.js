/**
 * Chrome浏览器自动化示例脚本
 * 
 * 这个脚本展示了如何使用chrome-automation-mcp进行基本的浏览器自动化
 * 可以在MCP服务器中使用run_script工具执行此脚本
 */

// 脚本参数
const args = args || {};
const searchQuery = args.query || 'MCP Model Context Protocol';
const targetUrl = args.url || 'https://www.google.com';

console.log(`🚀 开始浏览器自动化测试`);
console.log(`🔍 搜索查询: ${searchQuery}`);
console.log(`🌐 目标网址: ${targetUrl}`);

try {
    // 1. 导航到Google
    console.log(`📄 导航到: ${targetUrl}`);
    await page.goto(targetUrl);
    
    // 2. 等待页面加载
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面加载完成');
    
    // 3. 输入搜索词
    console.log(`⌨️ 输入搜索词: ${searchQuery}`);
    await page.fill('textarea[name="q"], input[name="q"]', searchQuery);
    
    // 4. 按下Enter键搜索
    console.log('🔍 开始搜索...');
    await page.press('textarea[name="q"], input[name="q"]', 'Enter');
    
    // 5. 等待搜索结果
    await page.waitForSelector('h3', { timeout: 10000 });
    console.log('✅ 搜索结果加载完成');
    
    // 6. 获取搜索结果
    const results = await page.$$eval('h3', elements => 
        elements.map((el, index) => ({
            index: index + 1,
            title: el.textContent.trim(),
            link: el.closest('a')?.href || '无链接'
        })).slice(0, 10) // 只取前10个结果
    );
    
    // 7. 截取屏幕截图
    console.log('📸 截取屏幕截图...');
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    
    // 8. 获取页面信息
    const pageInfo = {
        title: await page.title(),
        url: page.url(),
        searchQuery: searchQuery,
        resultCount: results.length,
        timestamp: new Date().toISOString()
    };
    
    console.log('📊 页面信息:', pageInfo);
    console.log(`🔢 找到 ${results.length} 个搜索结果`);
    
    // 返回结果
    return {
        success: true,
        pageInfo: pageInfo,
        searchResults: results,
        screenshot: screenshotBuffer.toString('base64'),
        screenshotInfo: {
            format: 'base64',
            size: screenshotBuffer.length,
            type: 'image/png'
        },
        message: `成功搜索 "${searchQuery}"，找到 ${results.length} 个结果`
    };
    
} catch (error) {
    console.error('❌ 自动化脚本执行失败:', error);
    
    // 尝试截取错误时的屏幕截图
    let errorScreenshot = null;
    try {
        errorScreenshot = await page.screenshot({ fullPage: false });
    } catch (screenshotError) {
        console.error('无法截取错误截图:', screenshotError);
    }
    
    return {
        success: false,
        error: error.message,
        errorStack: error.stack,
        errorScreenshot: errorScreenshot ? errorScreenshot.toString('base64') : null,
        pageInfo: {
            url: page?.url() || '未知',
            title: await page?.title() || '未知'
        }
    };
}