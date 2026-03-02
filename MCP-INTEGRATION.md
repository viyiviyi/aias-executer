# MCP集成功能

AIAS Executor现在支持Everything Claude Code风格的多代理管理功能。通过MCP（Model Context Protocol）集成，可以动态加载外部MCP服务器的工具并注册到AIAS Executor中。

## 功能特性

1. **动态工具注册**：启动时自动加载配置的MCP服务器，并将其工具注册到系统中
2. **多协议支持**：支持Stdio、HTTP、SSE三种MCP传输协议
3. **配置驱动**：通过JSON配置文件管理MCP服务器
4. **热重载**：支持通过API重新连接MCP服务器
5. **状态监控**：提供API端点查看MCP服务器状态

## 配置文件

MCP服务器配置位于 `mcp-servers.json` 文件：

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name"],
      "env": {
        "API_KEY": "YOUR_API_KEY"
      },
      "description": "服务器描述"
    },
    "http-server": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "description": "HTTP MCP服务器"
    }
  }
}
```

### 配置选项

- **type**：传输类型，可选 `stdio`（默认）、`http`、`sse`
- **command**：对于stdio类型，要执行的命令
- **args**：命令参数
- **env**：环境变量
- **url**：对于http/sse类型，服务器URL
- **description**：服务器描述
- **disabled**：设为true可禁用该服务器

## API端点

### 获取MCP服务器状态
```
GET /api/mcp/status
```

响应示例：
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "servers": [
    {
      "name": "test-stdio",
      "connected": true,
      "tools": 3,
      "description": "测试Stdio MCP服务器"
    }
  ],
  "total": 1,
  "connected": 1,
  "totalTools": 3
}
```

### 重新连接MCP服务器
```
POST /api/mcp/reconnect
```

## 内置测试服务器

项目包含两个测试MCP服务器：

### 1. Stdio测试服务器 (`test-mcp-server.js`)
- 工具：`echo`、`add`、`get_time`
- 启动：`node test-mcp-server.js`

### 2. HTTP测试服务器 (`test-http-mcp-server.js`)
- 工具：`http_echo`、`calculate`
- 启动：`node test-http-mcp-server.js`
- 端口：3001
- MCP端点：`POST http://localhost:3001/mcp`

## 使用示例

### 1. 启动服务
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 启动HTTP测试服务器（可选）
node test-http-mcp-server.js

# 启动主服务
npm start
```

### 2. 使用批处理脚本（Windows）
```bash
start-with-mcp-test.bat
```

### 3. 查看MCP状态
```bash
curl http://localhost:23777/api/mcp/status
```

### 4. 使用MCP工具
MCP工具会被注册为 `{server-name}_{tool-name}` 格式，例如：
- `test-stdio_echo`
- `test-http_calculate`

可以通过 `/api/tools` 端点查看所有可用工具。

## 支持的MCP服务器

### 官方MCP服务器
1. **@modelcontextprotocol/server-memory** - 持久化内存
2. **@modelcontextprotocol/server-sequential-thinking** - 链式思考
3. **@modelcontextprotocol/server-filesystem** - 文件系统操作
4. **@modelcontextprotocol/server-github** - GitHub操作

### 社区MCP服务器
1. **@supabase/mcp-server-supabase** - Supabase数据库
2. **@railway/mcp-server** - Railway部署
3. **exa-mcp-server** - Exa网页搜索
4. **firecrawl-mcp** - 网页爬取

## 配置示例

### 完整配置示例
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "持久化内存跨会话"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      },
      "description": "GitHub操作"
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=your_project_ref"],
      "description": "Supabase数据库"
    }
  }
}
```

## 故障排除

### 常见问题

1. **MCP服务器连接失败**
   - 检查命令是否正确安装：`npx -y @modelcontextprotocol/server-memory`
   - 检查环境变量配置
   - 查看服务器日志

2. **HTTP服务器无法连接**
   - 确保HTTP服务器正在运行
   - 检查URL是否正确
   - 验证网络连接

3. **工具未注册**
   - 检查MCP服务器是否成功连接
   - 查看 `/api/mcp/status` 端点
   - 重新连接MCP服务器

### 日志查看
MCP连接和工具注册日志会在服务启动时显示：
```
🔗 开始连接MCP服务器...
🔗 正在连接MCP服务器: test-stdio
✅ 连接到MCP服务器: test-stdio, 获取到 3 个工具
📝 注册MCP工具: test-stdio_echo
📝 注册MCP工具: test-stdio_add
📝 注册MCP工具: test-stdio_get_time
```

## 扩展开发

### 添加新的MCP服务器
1. 在 `mcp-servers.json` 中添加服务器配置
2. 确保服务器命令可用
3. 重启服务或使用 `/api/mcp/reconnect` 端点

### 开发自定义MCP服务器
参考 `test-mcp-server.js` 和 `test-http-mcp-server.js` 示例。

## 性能注意事项

1. **连接数限制**：建议同时连接的MCP服务器不超过10个
2. **工具数量**：每个MCP服务器的工具数量会影响性能
3. **内存使用**：长期运行的MCP服务器可能会占用较多内存
4. **超时设置**：HTTP连接有30秒超时限制