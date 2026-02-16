# AIAS Executor

AI Agent System Executor - 一个简洁高效的OpenAI函数调用工具执行器

## 概述

AIAS Executor 是一个用Node.js和TypeScript重写的工具执行器，旨在解决原`openai-funcall-executor`项目的问题，提供更清晰、更高效的OpenAI函数调用支持。

## 主要改进

### 1. 简洁的返回结构
- 执行接口只返回必要的结果数据，避免冗余信息污染AI上下文
- 错误信息清晰简洁，不包含过多技术细节
- 批量执行结果结构优化

### 2. 清晰的工具说明
- 命令行工具(`execute_command`): 适合快速、即时执行的命令
- 终端工具(`create_terminal`/`terminal_input`): 适合需要持续交互的会话
- 每个工具都有明确的用途说明，避免混淆

### 3. 优化的工具设计
- 文件工具: 支持安全路径验证和文件类型检查
- 系统工具: 区分即时命令和交互式终端
- 网络工具: 简化的HTTP请求代理
- MCP工具: Model Context Protocol客户端支持

### 4. 符合OpenAI Function Calling API
- 支持OpenAI标准函数调用格式
- 提供符合OpenAI规范的tools列表
- 支持批量工具调用

## 快速开始

### 安装依赖
```bash
cd aias-executor
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 生产模式运行
```bash
npm run build
npm start
```
## API接口

### 1. 获取工具列表
```
GET /tools
```

返回符合OpenAI Function Calling格式的tools列表。

### 2. 执行工具
```
POST /tools/execute
```

支持两种请求格式：

#### OpenAI标准格式
```json
{
  "type": "function",
  "function": {
    "name": "read_file",
    "arguments": "{\"path\": \"README.md\"}"
  }
}
```

#### 原有格式（向后兼容）
```json
{
  "tool": "read_file",
  "parameters": {
    "path": "README.md"
  }
}
```

### 3. 健康检查
```
GET /health
```

返回服务健康状态。

#### 原有格式（向后兼容）
```json
{
  "tool": "read_file",
  "parameters": {
    "path": "README.md"
```

### 3. 健康检查
```
GET /health
```

返回服务健康状态。

## 可用工具

### 文件工具
- `read_file`: 读取文本文件内容
- `write_file`: 写入文件内容
- `list_directory`: 列出目录内容

- `list_directory`: 列出目录内容
- `update_file`: 部分更新文件内容（使用直观的参数：start_line_index, insert_content, del_line_count）

### 系统工具
- `execute_command`: 执行命令行命令（即时执行）
- `create_terminal`: 创建交互式终端会话
- `terminal_input`: 向终端输入命令
- `close_terminal`: 关闭终端会话
- `list_terminals`: 列出活动终端

### 网络工具
- `http_request`: 代理HTTP请求

### MCP工具 (Model Context Protocol)
- `mcp_discover_servers`: 自动发现MCP服务器
- `mcp_scan_server`: 扫描MCP服务器以获取工具列表
- `mcp_add_server`: 添加MCP服务器
- `mcp_call_tool`: 调用MCP工具
- `mcp_list_tools`: 列出所有可用的MCP工具
- `mcp_list_servers`: 列出所有已配置的MCP服务器
- `mcp_start_server`: 启动MCP服务器
- `mcp_stop_server`: 停止MCP服务器
- `mcp_remove_server`: 移除MCP服务器

## 工具使用指南

### 命令行 vs 终端

#### 使用 `execute_command` 当：
- 需要快速执行一个命令并获取结果
- 命令是即时完成的（如 `ls`, `pwd`, `cat file.txt`）
- 不需要交互式输入

#### 使用 `create_terminal` + `terminal_input` 当：
- 需要运行长时间进程（如 `npm start`, `python server.py`）
- 需要交互式程序（如 `python`, `node`, `bash` 交互模式）
- 需要保持会话状态

### 文件更新工具 (`update_file`)
用于部分修改文件内容，使用直观的参数：
- **插入内容** (`insert`): 在指定位置插入字符串内容（支持多行）
- **删除行** (`delete`): 从指定位置开始删除指定行数

**参数说明**:
- `start_line_index`: 起始行索引（1-based）
- `insert_content`: 要插入的内容字符串
- `del_line_count`: 要删除的行数
- `operation`: 'insert' 或 'delete'

### MCP工具
用于与Model Context Protocol服务器交互：
- **发现和扫描**: 自动发现和扫描MCP服务器
- **服务器管理**: 添加、启动、停止、移除MCP服务器
- **工具调用**: 调用MCP服务器提供的工具

## 使用示例

### 读取文件
```bash
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "read_file",
    "parameters": {
      "path": "README.md"
    }
  }'
```

### 执行命令
```bash
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "execute_command",
    "parameters": {
      "command": "ls -la"
    }
  }'
```

### 更新文件（删除行）- 新参数格式
```bash
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "update_file",
    "parameters": {
      "path": "test.txt",
      "updates": [
        {
          "operation": "delete",
          "start_line_index": 5,
          "del_line_count": 2
        }
      ]
    }
  }'
```

### 更新文件（插入内容）- 新参数格式
```bash
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "update_file",
    "parameters": {
      "path": "test.txt",
      "updates": [
        {
          "operation": "insert",
          "start_line_index": 3,
          "insert_content": "新插入的第一行\n新插入的第二行\n新插入的第三行"
        }
      ]
    }
  }'
```

### 更新文件（批量操作）- 新参数格式
```bash
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "update_file",
    "parameters": {
      "path": "config.txt",
      "updates": [
        {
          "operation": "delete",
          "start_line_index": 10,
          "del_line_count": 3
        },
        {
          "operation": "insert",
          "start_line_index": 5,
          "insert_content": "配置项1\n配置项2"
        }
      ]
    }
  }'
```

### MCP工具使用
```bash
# 添加MCP服务器
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "mcp_add_server",
    "parameters": {
      "name": "example-server",
      "description": "示例MCP服务器",
      "command": ["node", "mcp-server.js"]
    }
  }'

# 启动MCP服务器
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "mcp_start_server",
    "parameters": {
      "server_name": "example-server"
    }
  }'

# 调用MCP工具
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "mcp_call_tool",
    "parameters": {
      "tool_name": "example_tool",
      "arguments": {"param": "value"}
    }
  }'
```

### 创建终端并运行命令
```bash
# 创建终端
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_terminal",
    "parameters": {
      "workdir": "."
    }
  }'

# 向终端输入命令（使用返回的terminal_id）
curl -X POST http://localhost:23777/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "terminal_input",
    "parameters": {
      "terminal_id": "生成的ID",
      "input": "npm start"
    }
  }'
```

## 安全特性

1. **路径验证**: 确保所有文件操作都在工作目录内
2. **命令白名单**: 只允许执行预定义的命令
3. **文件类型限制**: 只允许操作特定扩展名的文件
4. **文件大小限制**: 防止读取过大文件
5. **超时控制**: 所有操作都有超时限制
6. **MCP安全**: MCP服务器进程隔离

## 开发

### 项目结构
```
aias-executor/
├── src/
│   ├── core/          # 核心模块
│   │   ├── config.ts      # 配置管理
│   │   ├── executor.ts    # 工具执行器
│   │   ├── tool-registry.ts # 工具注册表
│   │   └── mcp-client.ts  # MCP客户端
│   ├── tools/         # 工具实现
│   │   ├── file/      # 文件工具
│   │   ├── system/    # 系统工具
│   │   ├── network/   # 网络工具
│   │   └── mcp/       # MCP工具
│   ├── api/           # API接口
│   ├── types/         # TypeScript类型定义
│   └── index.ts       # 应用入口
├── package.json
├── tsconfig.json
└── README.md
```

### 添加新工具

1. 在 `src/tools/` 下创建工具文件
2. 实现 `Tool` 接口
3. 在 `src/tools/index.ts` 中注册工具
4. 重新启动服务

## 许可证

MIT