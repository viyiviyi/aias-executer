# 项目开发维护指南

## 项目概述
这是一个可以维护当前tools的项目，以自举的形式维护自身。项目提供了多种工具，包括文件操作、系统命令执行、网络请求等。

## 最新更新（2026-02-17）

### 跨域设置优化
已为项目添加完整的跨域支持，默认允许所有域名访问。

#### 主要改进：
1. **完整的CORS配置**：
   - `origin: '*'` - 允许所有域名
   - `methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']` - 支持所有常用HTTP方法
   - `allowedHeaders: ['Content-Type', 'Authorization']` - 允许必要的请求头
   - `credentials: true` - 支持凭证（cookies、认证头等）

2. **预检请求支持**：
   - 正确处理OPTIONS预检请求
   - 返回正确的CORS响应头
   - 支持复杂请求的跨域访问

3. **所有端点支持**：
   - `/health` - 健康检查端点
   - `/api/tools` - 工具列表端点
   - `/api/execute` - 工具执行端点
   - `/` - 根路径端点

#### 测试验证：
- ✅ GET请求返回 `access-control-allow-origin: *`
- ✅ OPTIONS预检请求返回正确的CORS头
- ✅ 支持来自任意域名的跨域访问
- ✅ 支持带凭证的请求

#### 配置位置：
```typescript
// 在 src/index.ts 中
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

#### 使用示例：
```javascript
// 从任何域名都可以访问
fetch('http://localhost:23777/api/tools', {
  method: 'GET',
  headers: {
    'Origin': 'http://example.com',
    'Content-Type': 'application/json'
  }
});

// 带凭证的请求
fetch('http://localhost:23777/api/execute', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Origin': 'http://another-domain.com',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: JSON.stringify({
    tool: 'read_file',
    parameters: { path: 'README.md' }
  })
});
```
### 终端功能全面升级
已对终端工具进行全面升级，新增 `read_terminal_output` 工具，并优化了终端输出处理逻辑。

#### 新增功能：
1. **read_terminal_output 工具**：主动读取终端输出，无需发送命令
2. **增强的输出处理逻辑**：
   - 最多等待30秒或超过3秒无新输出时返回
   - 返回的输出最多包含最近30行
   - 读取时如果无新输出，返回最后5行并告知无新输出
   - 不区分标准输出和错误输出，合并处理
3. **终端线程持续运行**：终端线程会一直运行在后台，直到关闭
4. **缓冲区管理**：
   - 上次读取位置保存在后台，不暴露给调用方
   - 缓冲区限制为1000行，防止内存溢出
   - 自动清理最旧的行，保持缓冲区大小

#### 终端工具组：
- `create_terminal` - 创建终端会话
- `terminal_input` - 向终端输入命令并等待输出
- `read_terminal_output` - 主动读取终端输出
- `close_terminal` - 关闭终端会话
- `list_terminals` - 列出所有活动终端

#### 使用示例：
```javascript
// 创建终端
create_terminal({
  shell: 'bash',
  workdir: '.',
  description: '测试终端',
  initial_command: 'echo 终端已启动'
});

// 向终端发送命令
terminal_input({
  terminal_id: 'terminal-id',
  input: 'ls -la',
  wait_timeout: 30,
  max_lines: 30
});

// 主动读取终端输出
read_terminal_output({
  terminal_id: 'terminal-id',
  wait_timeout: 30,
  max_lines: 30
});

// 列出所有终端
list_terminals();

// 关闭终端
close_terminal({
  terminal_id: 'terminal-id'
});
```
## 可用工具列表
1. **文件操作工具**：
   - `read_file` - 读取文件内容
   - `write_file` - 写入文件
   - `list_directory` - 列出目录
   - `update_file` - 更新文件内容
   - `read_code` - 读取代码文件（带行号，使用制表符│格式）

2. **系统工具**：
   - `execute_command` - 执行命令
   - `create_terminal` - 创建终端
   - `terminal_input` - 终端输入
   - `read_terminal_output` - 读取终端输出
   - `close_terminal` - 关闭终端
   - `list_terminals` - 列出终端
   - `get_tools_documentation` - 获取工具文档

3. **网络工具**：
   - `http_request` - HTTP请求

4. **MCP工具**：
   - `mcp_discover_servers` - 发现MCP服务器
   - `mcp_scan_server` - 扫描MCP服务器
   - `mcp_add_server` - 添加MCP服务器
   - `mcp_call_tool` - 调用MCP工具
   - `mcp_list_tools` - 列出MCP工具
   - `mcp_list_servers` - 列出MCP服务器
   - `mcp_start_server` - 启动MCP服务器
   - `mcp_stop_server` - 停止MCP服务器
   - `mcp_remove_server` - 移除MCP服务器

### read_code 工具优化
已对 `read_code` 工具进行优化，移除了 `lines_with_numbers` 数组，简化了返回结构，并将默认行号格式改为使用制表符 `│`。

#### 主要改进：
1. **简化返回结构**：移除了 `lines_with_numbers` 数组，避免干扰上下文
2. **改进行号格式**：默认使用制表符 `│` 代替冒号 `:`，更清晰易读
3. **保持核心功能**：保留行号显示、行范围选择、自定义格式等功能

#### 当前返回结构：
```typescript
{
  content: string,           // 格式化后的内容（带行号）
  total_lines: number,       // 文件总行数
  start_line: number,        // 实际读取的起始行
  end_line: number          // 实际读取的结束行
}
```

#### 默认行号格式：
- 旧格式：`{line}: `（例如：`1: `, `2: `）
- 新格式：`{line}│`（例如：`1│`, `2│`）

#### 使用示例：
```javascript
// 使用默认格式（制表符│）
read_code({
  path: 'example.py'
});

// 使用自定义格式
read_code({
  path: 'example.py',
  line_number_format: '[{line}] '
});

// 不显示行号
read_code({
  path: 'example.py',
  show_line_numbers: false
});

// 读取部分行
read_code({
  path: 'example.py',
  start_line: 5,
  end_line: 15
});
```
{
  content: string,           // 格式化后的内容（带行号）
  total_lines: number,       // 文件总行数
  start_line: number,        // 实际读取的起始行
  end_line: number          // 实际读取的结束行
}
```

#### 默认行号格式：
- 旧格式：`{line}: `（例如：`1: `, `2: `）
- 新格式：`{line}│`（例如：`1│`, `2│`）

#### 使用示例：
```javascript
// 使用默认格式（制表符│）
read_code({
  path: 'example.py'
});

// 使用自定义格式
read_code({
  path: 'example.py',
  line_number_format: '[{line}] '
});

// 不显示行号
read_code({
  path: 'example.py',
  show_line_numbers: false
});

// 读取部分行
read_code({
  path: 'example.py',
  start_line: 5,
  end_line: 15
});
```

## 项目结构
```
src/
├── api/                    # API接口
├── core/                  # 核心模块
│   ├── config.ts         # 配置管理
│   ├── executor.ts       # 工具执行器
│   ├── mcp-client.ts     # MCP客户端
│   └── tool-registry.ts  # 工具注册表
├── tools/                # 工具实现
│   ├── file/            # 文件操作工具
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── list-directory.ts
│   │   ├── update-file.ts
│   │   └── read-code.ts  # 优化后的read_code工具
│   ├── system/          # 系统工具
│   ├── network/         # 网络工具
│   └── mcp/             # MCP工具
├── types/               # 类型定义
└── index.ts            # 项目入口
```

## 可用工具列表
1. **文件操作工具**：
   - `read_file` - 读取文件内容
   - `write_file` - 写入文件
   - `list_directory` - 列出目录
   - `update_file` - 更新文件内容
   - `read_code` - 读取代码文件（带行号，使用制表符│格式）

2. **系统工具**：
   - `execute_command` - 执行命令
   - `create_terminal` - 创建终端
   - `terminal_input` - 终端输入
   - `close_terminal` - 关闭终端
   - `list_terminals` - 列出终端
   - `get_tools_documentation` - 获取工具文档

3. **网络工具**：
   - `http_request` - HTTP请求

4. **MCP工具**：
   - `mcp_discover_servers` - 发现MCP服务器
   - `mcp_scan_server` - 扫描MCP服务器
   - `mcp_add_server` - 添加MCP服务器
   - `mcp_call_tool` - 调用MCP工具
   - `mcp_list_tools` - 列出MCP工具
   - `mcp_list_servers` - 列出MCP服务器
   - `mcp_start_server` - 启动MCP服务器
   - `mcp_stop_server` - 停止MCP服务器
   - `mcp_remove_server` - 移除MCP服务器

## 开发指南
1. **添加新工具**：
   - 在 `src/tools/` 相应目录下创建工具文件
   - 实现工具定义和执行函数
   - 在 `src/tools/index.ts` 中注册工具
   - 更新 `get_tools_documentation` 工具文档

2. **代码规范**：
   - 使用TypeScript编写
   - 遵循现有代码结构
   - 包含完整的类型定义
   - 添加适当的错误处理

3. **测试**：
   - 创建测试文件验证功能
   - 测试边界条件和错误情况
   - 确保与现有工具兼容

## 构建和运行
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行项目
npm start
```

## 注意事项
1. 工具执行有安全限制，避免操作敏感系统文件
2. 文件操作有大小限制，大文件需要分块处理
3. 命令执行有超时限制，长时间任务建议使用终端工具
4. 网络请求需要验证目标URL的安全性

## 维护记录
- 2026-02-17：全面升级终端功能，新增 `read_terminal_output` 工具，优化输出处理逻辑
- 2026-02-17：优化 `read_code` 工具，移除 `lines_with_numbers` 数组，默认使用制表符 `│` 格式
- 2026-02-17：添加 `read_code` 工具，支持带行号的代码文件读取
- 2026-02-16：项目初始版本，包含基础文件操作、系统命令、网络请求等工具
- 2026-02-17：添加完整的跨域支持，默认允许所有域名访问，支持预检请求和带凭证的请求

---
---
*最后更新：2026-02-17*