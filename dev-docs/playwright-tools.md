# Playwright 浏览器工具文档

## 概述

本项目集成了Playwright浏览器自动化工具，提供了基础的浏览器控制、页面交互和内容获取功能。所有工具都遵循现有的工具设计风格。

## 可用工具

### 1. `open_browser` - 打开浏览器

**功能**: 打开浏览器并导航到指定URL

**参数**:
- `url` (必需): 要打开的URL地址
- `browser` (可选): 浏览器类型，可选值: `chrome`, `firefox`, `webkit`, `msedge`，默认: `chrome`
- `session_name` (可选): 浏览器会话名称，用于管理多个浏览器会话，默认: `default`
- `headless` (可选): 是否以无头模式运行，默认: `false`（显示浏览器界面）
- `timeout` (可选): 超时时间（秒），默认: 30，范围: 5-300

**返回示例**:
```json
{
  "success": true,
  "session_id": "default",
  "browser_type": "chrome",
  "headless": false,
  "page_info": {
    "title": "Example Domain",
    "url": "https://example.com/",
    "original_url": "https://example.com"
  },
  "message": "浏览器已成功打开并导航到 https://example.com",
  "sessions_count": 1
}
```

### 2. `get_page_content` - 获取页面内容

**功能**: 获取当前页面的完整内容，包括HTML、文本、截图和元数据

**参数**:
- `browser_id` (可选): 浏览器会话名称，默认: `default`
- `timeout` (可选): 超时时间（秒），默认: 30，范围: 5-300

**返回示例**:
```json
{
  "success": true,
  "session_id": "default",
  "page_info": {
    "title": "Example Domain",
    "url": "https://example.com/",
    "html_content_length": 1250,
    "text_content_length": 850,
    "screenshot": "data:image/jpeg;base64,...",
    "meta_data": { "description": "Example Domain" },
    "links_count": 2,
    "structure": {
      "h1": ["Example Domain"],
      "h2": [],
      "h3": [],
      "total_headings": 1
    }
  },
  "content_preview": {
    "html_preview": "<!DOCTYPE html>...",
    "text_preview": "Example Domain...",
    "links_preview": [{ "text": "More information...", "href": "https://www.iana.org/..." }]
  },
  "statistics": {
    "total_characters": 1250,
    "total_words": 250,
    "total_links": 2,
    "total_images": 0,
    "total_forms": 0,
    "total_scripts": 1,
    "total_styles": 1
  }
}
```

### 3. `interact_with_page` - 页面交互

**功能**: 与页面进行各种交互操作

**参数**:
- `browser_id` (可选): 浏览器会话名称，默认: `default`
- `action` (必需): 操作类型，可选值: `click`, `click_coordinate`, `fill`, `press`, `hover`, `select`, `check`, `uncheck`, `goto`, `go_back`, `go_forward`, `reload`
- `selector` (可选): CSS选择器（对于需要定位的操作）
- `text` (可选): 要输入的文本（对于type、fill操作需要）
- `value` (可选): 要选择的值（对于select操作需要）
- `key` (可选): 要按下的键（对于press操作需要），如Enter、Tab、ArrowDown等
- `url` (可选): 要导航到的URL（对于goto操作需要）
- `wait_for_navigation` (可选): 操作后是否等待页面导航完成，默认: `true`
- `x` (可选): X坐标（对于click_coordinate操作需要）
- `y` (可选): Y坐标（对于click_coordinate操作需要）
- `timeout` (可选): 超时时间（秒），默认: 30，范围: 5-300

**操作示例**:

1. **点击元素**:
```json
{
  "browser_id": "default",
  "action": "click",
  "selector": "button.submit"
}
```

2. **输入文本**:
```json
{
  "browser_id": "default",
  "action": "type",
  "selector": "input[name='username']",
  "text": "testuser"
}
```

3. **导航到新页面**:
```json
{
  "browser_id": "default",
  "action": "goto",
  "url": "https://google.com"
}
```

4. **按下键盘键**:
```json
{
  "browser_id": "default",
  "action": "press",
  "key": "Enter"
}
```

5. **按坐标点击**:
```json
{
  "browser_id": "default",
  "action": "click_coordinate",
  "x": 100,
  "y": 200
}
```

### 4. `close_browser` - 关闭浏览器

**功能**: 关闭浏览器会话

**参数**:
- `browser_id` (可选): 要关闭的浏览器ID，如果为"all"则关闭所有浏览器，默认: `default`
- `delete_data` (可选): 是否删除浏览器数据（如cookies、localStorage等），默认: `false`
- `force_kill` (可选): 是否强制杀死浏览器进程（仅当browser_id为"all"时有效），默认: `false`
- `timeout` (可选): 超时时间（秒），默认: 30，范围: 5-300

**返回示例**:
```json
{
  "success": true,
  "message": "已关闭浏览器会话: default",
  "session_id": "default",
  "closed": true,
  "delete_data": false,
  "remaining_sessions": 0,
  "remaining_session_ids": []
}
```

## 使用示例

### 完整工作流程

```javascript
// 1. 打开浏览器
await open_browser({
  url: "https://example.com",
  browser: "chrome",
  headless: false
});

// 2. 获取页面内容
const content = await get_page_content({
  browser_id: "default"
});

// 3. 与页面交互
await interact_with_page({
  browser_id: "default",
  action: "click",
  selector: "a[href='/about']"
});

// 4. 获取交互后的页面内容
const newContent = await get_page_content({
  browser_id: "default"
});

// 5. 关闭浏览器
await close_browser({
  browser_id: "default"
});
```

### 多会话管理

```javascript
// 打开第一个浏览器会话
await open_browser({
  url: "https://example.com",
  session_name: "session1"
});

// 打开第二个浏览器会话
await open_browser({
  url: "https://google.com",
  session_name: "session2",
  browser: "firefox"
});

// 在两个会话间切换操作
await interact_with_page({
  browser_id: "session1",
  action: "click",
  selector: "a.link"
});

await interact_with_page({
  browser_id: "session2",
  action: "type",
  selector: "input[name='q']",
  text: "playwright"
});

// 关闭所有会话
await close_browser({
  browser_id: "all"
});
```

## 注意事项

1. **会话管理**: 浏览器会话管理器会自动管理会话生命周期，30分钟无活动会自动清理
2. **资源限制**: 最多同时支持5个浏览器会话，超过时会自动清理最旧的会话
3. **错误处理**: 所有工具都有完善的错误处理，会返回详细的错误信息
4. **内存管理**: 建议及时关闭不再使用的浏览器会话，避免内存泄漏
5. **超时控制**: 所有操作都有超时控制，默认30秒，可根据需要调整

## 技术实现

### 浏览器管理器 (BrowserManager)
- 单例模式管理所有浏览器会话
- 自动清理过期会话
- 支持多会话并发
- 资源使用限制

### 会话管理
- 每个会话有唯一的session_id
- 会话信息包括创建时间、最后使用时间
- 支持会话复用

### 错误处理
- 统一的错误处理机制
- 详细的错误信息返回
- 资源清理保障

## 常见问题

### Q: 浏览器无法启动怎么办？
A: 检查是否安装了Playwright浏览器：`npx playwright install`

### Q: 如何查看当前活动的浏览器会话？
A: 浏览器管理器内部会记录所有会话，但目前没有公开API。可以通过返回的`sessions_count`了解会话数量。

### Q: 支持哪些浏览器？
A: 支持Chrome、Firefox、WebKit和Microsoft Edge（基于Chromium）。

### Q: 无头模式和有头模式有什么区别？
A: 无头模式不显示浏览器界面，适合自动化测试和服务器环境。有头模式会显示浏览器窗口，适合调试和交互式操作。

### Q: 如何设置代理？
A: 当前版本不支持代理设置，后续版本可以考虑添加。

## 版本历史

### v1.0.0 (2026-02-24)
- 初始版本发布
- 基础浏览器控制功能
- 页面交互功能
- 内容获取功能
- 多会话管理