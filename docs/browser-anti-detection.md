# 浏览器反检测功能使用指南

## 概述

AIAS Executor 的浏览器工具现已集成反检测功能，所有配置都通过配置文件管理。`open_browser` 工具现在只接受 `url`、`session_name` 和 `timeout` 参数，其他配置如浏览器类型、无头模式、反检测等都在配置文件中设置。

## 配置文件

浏览器配置位于 `config/browser.yaml`，包含以下主要设置：

### 基本配置
```yaml
defaultBrowser: chrome          # 默认浏览器：chrome, firefox, webkit, msedge
defaultHeadless: false          # 是否默认以无头模式运行
antiDetection: true             # 是否启用反检测功能
userDataDir: ./browser-data     # 用户数据目录（相对或绝对路径）
timeout: 30                     # 默认超时时间（秒）
```

### 视口和用户代理
```yaml
viewport:
  width: 1280
  height: 720

userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

### 反检测设置
```yaml
stealthOptions:
  enable: true
  options:
    webglVendor: Intel Inc.
    renderer: Intel Iris OpenGL Engine
    hardwareConcurrency: 8
    deviceMemory: 8
    screenResolution: 1920x1080
    languages:
      - zh-CN
      - zh
      - en-US
      - en
    platform: Win32
    webdriver: false
```

### 会话管理
```yaml
maxSessions: 5          # 最大同时会话数
sessionTimeout: 30      # 会话超时时间（分钟）
```

## 新工具

### 1. open_browser
**参数简化**：现在只接受3个参数：
- `url` (必需): 要打开的URL地址
- `session_name` (可选): 浏览器会话名称，默认为 'default'
- `timeout` (可选): 超时时间（秒），默认为30

**示例**：
```json
{
  "url": "https://example.com",
  "session_name": "test-session",
  "timeout": 60
}
```

### 2. manage_browser_config
**功能**：管理浏览器配置

**参数**：
- `action` (必需): 操作类型：`get`（获取配置）、`update`（更新配置）、`reload`（重新加载配置）
- `config` (可选): 当action为`update`时，要更新的配置对象

**示例**：
```json
// 获取当前配置
{
  "action": "get"
}

// 更新配置
{
  "action": "update",
  "config": {
    "defaultHeadless": true,
    "antiDetection": true,
    "timeout": 60
  }
}

// 重新加载配置
{
  "action": "reload"
}
```

## 反检测功能特性

### 1. WebDriver属性隐藏
- 删除 `navigator.webdriver` 属性
- 防止网站检测到自动化工具

### 2. 用户代理伪装
- 使用真实的浏览器用户代理
- 支持自定义用户代理字符串

### 3. WebGL指纹修改
- 修改WebGL渲染器和供应商信息
- 防止通过WebGL进行浏览器指纹识别

### 4. Canvas指纹修改
- 修改Canvas API输出
- 添加微小随机变化防止指纹识别

### 5. 屏幕和硬件信息伪装
- 修改屏幕分辨率
- 修改硬件并发数
- 修改设备内存信息

### 6. 插件和语言设置
- 修改插件列表
- 设置多语言支持
- 修改平台信息

### 7. 其他反检测措施
- 时区修改
- WebRTC屏蔽
- 电池API伪装
- 连接信息伪装
- 权限API伪装
- 通知API伪装
- 地理位置屏蔽
- 存储API伪装
- 性能API修改
- 时间API修改
- 随机数修改

## 使用示例

### 基本使用
```javascript
// 打开浏览器（使用配置文件中的默认设置）
await open_browser({
  url: "https://example.com",
  session_name: "my-session"
});

// 获取页面内容
await get_page_content({
  browser_id: "my-session"
});

// 与页面交互
await interact_with_page({
  browser_id: "my-session",
  action: "click",
  selector: "button.submit"
});

// 关闭浏览器
await close_browser({
  browser_id: "my-session"
});
```

### 配置管理
```javascript
// 查看当前配置
const config = await manage_browser_config({
  action: "get"
});

// 更新配置
await manage_browser_config({
  action: "update",
  config: {
    defaultHeadless: true,
    antiDetection: true,
    userDataDir: "./custom-browser-data",
    timeout: 60
  }
});

// 重新加载配置
await manage_browser_config({
  action: "reload"
});
```

## 高级配置

### 自定义用户数据目录
用户数据目录用于保存浏览器缓存、cookies、历史记录等。启用后可以提供更真实的浏览器行为。

```yaml
userDataDir: ./browser-data
```

### 自定义启动参数
```yaml
args:
  - --no-sandbox
  - --disable-dev-shm-usage
  - --disable-blink-features=AutomationControlled
  - --disable-web-security
```

### 自定义反检测选项
```yaml
stealthOptions:
  enable: true
  options:
    webglVendor: "NVIDIA Corporation"
    renderer: "NVIDIA GeForce RTX 3080/PCIe/SSE2"
    hardwareConcurrency: 16
    deviceMemory: 16
    screenResolution: "2560x1440"
```

## 注意事项

1. **性能影响**：反检测功能会增加浏览器启动时间和内存使用
2. **兼容性**：某些反检测措施可能与特定网站不兼容
3. **用户数据**：使用用户数据目录时，确保目录可写且有足够空间
4. **会话管理**：及时关闭不需要的会话，避免达到最大会话限制
5. **超时设置**：根据网络状况适当调整超时时间

## 故障排除

### 常见问题

1. **浏览器启动失败**
   - 检查Playwright是否正确安装：`npx playwright install`
   - 检查是否有足够的系统资源
   - 检查配置文件语法是否正确

2. **反检测功能无效**
   - 确保 `antiDetection: true` 且 `stealthOptions.enable: true`
   - 检查浏览器控制台是否有错误信息
   - 尝试禁用部分反检测功能测试

3. **会话管理问题**
   - 检查是否达到最大会话数限制
   - 检查会话是否已过期
   - 使用 `manage_browser_config` 查看当前会话状态

### 调试建议

1. 使用 `manage_browser_config` 获取当前配置和会话状态
2. 暂时禁用反检测功能测试
3. 使用无头模式进行调试
4. 检查浏览器控制台输出
5. 查看系统日志中的错误信息

## 更新日志

### 2026-02-25
- 添加反检测功能
- 重构配置到配置文件
- 简化 `open_browser` 工具参数
- 添加 `manage_browser_config` 工具
- 支持用户数据目录
- 增强会话管理功能

## 相关工具

- `open_browser`: 打开浏览器
- `get_page_content`: 获取页面内容
- `interact_with_page`: 与页面交互
- `close_browser`: 关闭浏览器
- `manage_browser_config`: 管理浏览器配置