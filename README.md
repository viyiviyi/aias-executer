# AIAS Executor

AI Agent System Executor - 一个简洁高效的OpenAI函数调用工具执行器

## 概述

AIAS Executor 是一个用Node.js和TypeScript重写的工具执行器，为[https://github.com/viyiviyi/AI-Assistant-ChatGPT](https://github.com/viyiviyi/AI-Assistant-ChatGPT)项目提供文件、执行命令、访问mcp服务的能力。

## 主要改进
### 5. 配置文件支持
- 支持从YAML/JSON配置文件读取配置
- 环境变量优先级高于配置文件
- 支持热重载配置
- Docker容器映射config目录


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

### 使用PM2快速启动（推荐）

```bash
# 安装PM2（如果尚未安装）
npm install -g pm2

# 安装项目依赖
npm install

# 构建项目
npm run build

# 使用PM2启动服务
pm2 start npm --name "aias-executor" -- start

# 设置开机自启
pm2 save
pm2 startup
```

对于Windows用户，可以使用我们提供的批处理脚本：
```
# 以管理员身份运行
setup-pm2-windows.bat
```

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
## PM2进程管理（推荐用于生产环境）

PM2是一个强大的Node.js进程管理器，支持自动重启、日志管理、集群模式等功能。我们提供了便捷的安装脚本：

- **Windows用户**: 运行 `setup-pm2-windows.bat`（需要管理员权限）
- **Linux/Mac用户**: 运行 `./setup-pm2-linux.sh`

或者按照以下步骤手动安装：

### 安装PM2

```bash
# 全局安装PM2
npm install -g pm2

# 或者使用yarn
npm install -g pm2
```

### 使用PM2启动服务

#### 开发模式
```bash
# 使用PM2启动开发服务器（自动重启）
pm2 start npm --name "aias-executor-dev" -- run dev
```

#### 生产模式
```bash
# 1. 构建项目
npm run build

# 2. 使用PM2启动生产服务器
pm2 start npm --name "aias-executor" -- start
```

### PM2常用命令

```bash
# 查看所有进程
pm2 list

# 查看进程日志
pm2 logs aias-executor

# 查看特定进程的详细信息
pm2 show aias-executor

# 重启进程
pm2 restart aias-executor

# 停止进程
pm2 stop aias-executor

# 删除进程
pm2 delete aias-executor

# 保存当前进程列表（用于开机自启）
pm2 save

# 查看监控面板
pm2 monit
```

### Windows系统开机自启配置

在Windows系统中，PM2需要额外的配置来实现开机自启：

1. **安装PM2 Windows服务**
```bash
# 安装pm2-windows-startup
npm install -g pm2-windows-startup

# 安装PM2作为Windows服务
pm2-startup install
```

2. **保存当前进程配置**
```bash
# 启动你的应用（如果还没启动）
pm2 start npm --name "aias-executor" -- start

# 保存当前PM2配置
pm2 save
```

### PM2配置文件（可选）

创建 `ecosystem.config.js` 文件进行更详细的配置：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'aias-executor',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
```

使用配置文件启动：
```bash
# 使用配置文件启动
pm2 start ecosystem.config.js

# 使用特定环境
pm2 start ecosystem.config.js --env development
```

### 日志管理

PM2会自动管理日志，日志文件默认保存在 `~/.pm2/logs/` 目录下。

```bash
# 查看实时日志
pm2 logs aias-executor

# 查看最后100行日志
pm2 logs aias-executor --lines 100

# 清空日志
pm2 flush aias-executor
```

## API接口

### 1. 获取工具列表
```
GET /api/tools
```

返回符合OpenAI Function Calling格式的tools列表。

### 2. 执行工具
```
POST /api/execute
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

## 许可证

MIT

## 配置

### 配置文件

支持YAML和JSON格式的配置文件，配置文件按以下顺序查找：

1. `./config.yaml` 或 `./config.yml`
2. `./config.json`
3. `./config/config.yaml` 或 `./config/config.yml`
4. `./config/config.json`
5. `/app/config/config.yaml` 或 `/app/config/config.yml`
6. `/app/config/config.json`

### 配置优先级

1. **环境变量** (最高优先级)
2. **配置文件**
3. **默认值** (最低优先级)

### 配置示例

#### YAML格式 (`config.yaml`)
```yaml
# 服务器配置
server:
  port: 3000
  host: "0.0.0.0"

# 工作空间配置
workspace:
  dir: "/app/workspace"
  maxFileSize: 10485760  # 10MB
  allowedExtensions:
    - ".txt"
    - ".md"
    - ".py"
    - ".js"
    - ".ts"
    - ".json"
    - ".yaml"
    - ".yml"
  pathValidation: true

# 命令执行配置
command:
  timeout: 30
  allowedCommands:
    - "*"  # 允许所有命令
  maxTerminals: 10
```

#### JSON格式 (`config.json`)
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "workspace": {
    "dir": "/app/workspace",
    "maxFileSize": 10485760,
    "allowedExtensions": [
      ".txt",
      ".md",
      ".py",
      ".js",
      ".ts",
      ".json",
      ".yaml",
      ".yml"
    ],
    "pathValidation": true
  },
  "command": {
    "timeout": 30,
    "allowedCommands": ["*"],
    "maxTerminals": 10
  }
}
```

### 环境变量

所有配置都可以通过环境变量覆盖：

```bash
# 服务器配置
export PORT=3000
export HOST="0.0.0.0"

# 工作空间配置
export WORKSPACE_DIR="/app/workspace"
export MAX_FILE_SIZE=10485760
export ALLOWED_EXTENSIONS=".txt,.md,.py,.js,.ts,.json,.yaml,.yml"
export PATH_VALIDATION=true

# 命令执行配置
export COMMAND_TIMEOUT=30
export ALLOWED_COMMANDS="*"
export MAX_TERMINALS=10
```

### Docker配置

在Docker Compose中，配置文件目录会自动映射到容器中：

```yaml
services:
  aias-executor:
    volumes:
      # 配置文件目录
      - ./config:/app/config
      # 其他挂载...
```
## Docker部署

### 使用Docker Compose

1. 创建配置文件目录和配置文件：
```bash
mkdir config
cp config.example.yaml config/config.yaml
# 编辑配置文件
vim config/config.yaml
```

2. 启动服务：
```bash
docker-compose up -d
```

3. 查看日志：
```bash
docker-compose logs -f
```

### 自定义配置

可以通过环境变量或配置文件自定义配置：

```yaml
# docker-compose.yml
services:
  aias-executor:
    environment:
      - PORT=3001
      - WORKSPACE_DIR=/data/workspace
      - ALLOWED_COMMANDS=ls,cat,echo
    volumes:
      - ./config:/app/config
      - ./data/workspace:/data/workspace
```