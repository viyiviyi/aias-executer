# MCP协议支持

## 核心特性

- **完整协议实现**: 使用 `@modelcontextprotocol/sdk` 实现真正的MCP协议
- **多传输支持**: STDIO、HTTP、WebSocket传输协议
- **服务器发现**: 自动发现npm、pip、工作空间中的MCP服务器
- **工具动态发现**: 从运行的MCP服务器动态获取工具列表
- **连接管理**: 连接池、心跳检查、错误恢复

## 支持的MCP服务器类型

1. **文件系统**: `@modelcontextprotocol/server-filesystem`
2. **浏览器自动化**: `@modelcontextprotocol/server-browser`
3. **Git操作**: `@modelcontextprotocol/server-git`
4. **Chrome自动化**: `chrome-automation-mcp-full`
5. **Playwright**: `better-playwright-mcp`
6. **Python MCP服务器**: `mcp-server-git`, `mcp-server-postgres`等

## MCP客户端架构

### 核心模块

1. **mcp-client.ts**: 服务器发现、扫描、配置管理
2. **mcp-real-client.ts**: 真正的MCP协议通信实现

### 统一返回值格式

所有MCP相关方法返回以下格式：

```typescript
{
  success: boolean,
  result?: any,
  error?: string
}
```

### 连接管理特性

- **连接池**: 复用MCP服务器连接，提高性能
- **心跳检查**: 定期检查连接状态，保持连接活跃
- **错误恢复**: 连接失败时自动重试机制
- **资源清理**: 进程退出时自动清理所有连接

### 服务器发现机制

1. **npm包扫描**: 扫描node_modules中的MCP服务器包
2. **pip包扫描**: 扫描Python环境中的MCP服务器
3. **工作空间扫描**: 扫描工作空间目录中的MCP服务器配置
4. **手动添加**: 支持通过API手动添加MCP服务器

### 工具动态发现

- **实时获取**: 连接MCP服务器后实时获取可用工具列表
- **工具缓存**: 缓存工具列表，减少重复查询
- **工具更新**: 支持手动刷新工具列表
- **工具过滤**: 根据工具名称和描述进行筛选

### 传输协议支持

#### STDIO传输
- 标准输入输出通信
- 适用于本地进程间通信
- 支持子进程管理

#### HTTP传输
- RESTful API通信
- 支持远程服务器连接
- 支持认证和授权

#### WebSocket传输
- 实时双向通信
- 支持长连接保持
- 适用于实时数据交换

### 错误处理

#### 连接错误
- 服务器未响应
- 认证失败
- 协议版本不兼容

#### 通信错误
- 消息格式错误
- 超时错误
- 网络中断

#### 工具错误
- 工具不存在
- 参数验证失败
- 执行失败

### 性能优化

- **连接复用**: 避免重复建立连接
- **工具缓存**: 减少工具列表查询次数
- **批量操作**: 支持批量工具调用
- **异步处理**: 非阻塞IO操作