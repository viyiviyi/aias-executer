# AIAS Executor 项目文档

## 项目概述

AIAS Executor 是一个用Node.js和TypeScript重写的OpenAI函数调用工具执行器，旨在提供更清晰、更高效的AI工具执行环境。

## 解决的问题

- **简洁的返回结构**: 只返回执行结果或错误信息
- **清晰的工具说明**: 明确区分即时命令和交互式终端
- **优化的数据流**: 减少不必要的信息传递
- **标准API兼容**: 直接支持OpenAI Function Calling格式

## 架构设计

### 核心模块
1. **ConfigManager**: 配置管理，支持环境变量和路径验证
2. **ToolRegistry**: 工具注册表，管理所有可用工具
3. **ToolExecutor**: 工具执行器，处理工具调用和结果返回
4. **API Router**: RESTful API接口，提供HTTP服务

### 工具分类
1. **文件工具**: 文件读写、目录列表
2. **系统工具**: 命令行执行、终端管理
3. **网络工具**: HTTP请求代理
4. **MCP工具**: Model Context Protocol支持（后续版本）

## 技术栈

- **运行时**: Node.js (ES2022+)
- **语言**: TypeScript
- **Web框架**: Express.js
- **安全**: Helmet, CORS
- **开发工具**: ESLint, Prettier, Jest
- **构建工具**: TypeScript Compiler

## 配置说明

### 环境变量
```bash
# 基础配置
WORKSPACE_DIR=./workspace  # 工作目录
PORT=23777                 # 服务端口
HOST=0.0.0.0              # 绑定地址

# 安全配置
MAX_FILE_SIZE=10485760    # 最大文件大小（10MB）
COMMAND_TIMEOUT=30        # 命令超时时间（秒）
MAX_TERMINALS=10          # 最大终端数
PATH_VALIDATION=true      # 启用路径验证

# 命令白名单
ALLOWED_COMMANDS=ls,cat,grep,find,pwd,echo,cd,mkdir,rm,cp,mv

# 文件类型白名单
ALLOWED_EXTENSIONS=.txt,.md,.py,.js,.ts,.java,.cs,.dart,.json
```

### 配置优先级
1. 环境变量
2. 默认值
3. 配置文件（后续版本支持）

## API文档

### 基础端点
- `GET /` - 服务信息
- `GET /api/health` - 健康检查
- `GET /apu/tools` - 获取工具列表

### 工具执行
- `POST /ali/execute` - 执行工具

### 请求格式

#### OpenAI标准格式

#### OpenAI标准格式
```json
{
  "type": "function",
  "function": {
    "name": "tool_name",
    "arguments": "{\"param1\": \"value1\"}"
  }
}
```

#### 兼容格式
```json
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1"
  }
}
```

### 响应格式

#### 成功响应
```json
"文件内容或执行结果"
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 工具详细说明

### 文件工具

#### read_file
- **用途**: 读取文本文件内容
- **参数**: 
  - `path` (必需): 文件路径
  - `extensions` (可选): 允许的文件扩展名
  - `start_line`, `end_line` (可选): 行范围
  - `encoding` (可选): 文件编码
- **返回**: 文件内容字符串

#### write_file
- **用途**: 写入文件内容
- **参数**:
  - `path` (必需): 文件路径
  - `content` (必需): 要写入的内容
  - `encoding` (可选): 文件编码
  - `append` (可选): 是否追加
- **返回**: 成功消息

#### list_directory
- **用途**: 列出目录内容
- **参数**:
  - `path` (可选): 目录路径
  - `recursive` (可选): 是否递归
  - `skip_hidden` (可选): 跳过隐藏文件
  - `skip_dirs` (可选): 跳过的目录名
- **返回**: 目录结构信息

### 系统工具

#### execute_command
- **用途**: 执行即时命令行命令
- **适用场景**: 快速命令、不需要交互、即时完成
- **参数**:
  - `command` (必需): 要执行的命令
  - `workdir` (可选): 工作目录
  - `timeout` (可选): 超时时间
  - `env` (可选): 环境变量
- **返回**: 命令输出

#### create_terminal
- **用途**: 创建交互式终端会话
- **适用场景**: 长时间运行进程、交互式程序、需要保持状态
- **参数**:
  - `shell` (可选): Shell类型
  - `workdir` (可选): 工作目录
  - `env` (可选): 环境变量
  - `initial_command` (可选): 初始命令
- **返回**: 终端ID

#### terminal_input
- **用途**: 向终端输入命令
- **参数**:
  - `terminal_id` (必需): 终端ID
  - `input` (必需): 输入的命令
  - `wait_timeout` (可选): 等待超时
  - `max_lines` (可选): 最大输出行数
- **返回**: 终端输出

#### close_terminal
- **用途**: 关闭终端会话
- **参数**:
  - `terminal_id` (必需): 终端ID
- **返回**: 成功状态

#### list_terminals
- **用途**: 列出活动终端
- **参数**: 无
- **返回**: 终端列表

### 网络工具

#### http_request
- **用途**: 代理HTTP请求
- **参数**:
  - `url` (必需): 请求URL
  - `method` (可选): HTTP方法
  - `headers` (可选): 请求头
  - `params` (可选): 查询参数
  - `data` (可选): 请求体
  - `json_data` (可选): JSON请求体
  - `timeout` (可选): 超时时间
- **返回**: HTTP响应

## 安全特性

### 1. 路径安全
- 所有文件操作限制在工作目录内
- 支持相对路径和绝对路径验证
- 防止目录遍历攻击

### 2. 命令安全
- 命令白名单机制
- 命令参数验证
- 超时控制

### 3. 文件安全
- 文件类型白名单
- 文件大小限制
- 编码验证

### 4. 网络安全
- CORS配置
- Helmet安全头
- 请求大小限制

## 性能优化

### 1. 内存管理
- 流式文件读取
- 输出行数限制
- 终端输出缓冲区管理

### 2. 响应优化
- 精简的返回结构
- 错误信息标准化
- 批量请求支持

### 3. 并发控制
- 终端数量限制
- 命令超时控制
- 资源清理机制

## 扩展开发

### 添加新工具
1. 创建工具文件在 `src/tools/` 对应目录
2. 实现 `Tool` 接口
3. 在 `src/tools/index.ts` 中注册
4. 更新类型定义（如果需要）

### 工具接口
```typescript
interface Tool {
  definition: ToolDefinition;
  execute: (parameters: Record<string, any>) => Promise<any>;
}
```

### 配置扩展
1. 在 `ConfigManager` 中添加配置项
2. 更新环境变量说明
3. 添加配置验证

## 测试

### 单元测试
```bash
npm test
```

### API测试
```bash
# 使用curl测试API
curl http://localhost:23777/health
curl http://localhost:23777/tools
```

### 工具测试
```bash
# 测试文件读取
curl -X POST http://localhost:23777/tools/execute \
  -d '{"tool":"read_file","parameters":{"path":"README.md"}}'

# 测试命令执行
curl -X POST http://localhost:23777/tools/execute \
  -d '{"tool":"execute_command","parameters":{"command":"pwd"}}'
```

## 部署

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 23777
CMD ["node", "dist/index.js"]
```

### 环境部署
1. 安装Node.js 18+
2. 克隆项目代码
3. 安装依赖: `npm ci`
4. 构建项目: `npm run build`
5. 配置环境变量
6. 启动服务: `npm start`

## 监控与日志

### 健康检查
- `GET /health` 端点
- 返回服务状态和时间戳

### 日志输出
- 控制台日志
- 错误堆栈跟踪
- 请求日志（开发模式）

### 性能监控
- 内存使用监控
- 响应时间统计
- 错误率统计

## 版本规划

### v1.0.0 (当前)
- 基础文件工具
- 系统工具（命令+终端）
- 网络工具
- 基础安全特性

### v1.1.0 (计划中)
- 搜索工具 (`search_files`)
- 代码结构解析 (`parse_code_structure`)
- 文件更新工具 (`update_file`)
- Playwright浏览器工具

### v1.2.0 (计划中)
- MCP工具支持
- 密码管理器
- 配置热重载
- 性能监控

## 故障排除

### 常见问题

#### 1. 文件读取失败
- 检查文件路径是否正确
- 验证文件扩展名是否允许
- 检查文件大小是否超限

#### 2. 命令执行失败
- 检查命令是否在白名单中
- 验证工作目录是否存在
- 检查权限设置

#### 3. 终端连接失败
- 检查终端ID是否正确
- 验证终端是否已关闭
- 检查系统资源限制

#### 4. API请求失败
- 检查请求格式是否正确
- 验证Content-Type头
- 检查JSON格式

### 调试模式
设置环境变量 `DEBUG=true` 启用详细日志。

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送分支
5. 创建Pull Request

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化
- 添加类型定义
- 编写单元测试

## 许可证

MIT License - 详见LICENSE文件