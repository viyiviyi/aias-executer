# 开发工作流程和Docker配置

## 开发工作流程

### 1. 环境准备

```bash
# 进入项目目录
cd /workspace

# 安装依赖（如果未安装）
yarn install

# 启动开发服务（已自动运行）
yarn dev
```

### 2. 代码编辑

- 通过FileBrowser (http://localhost:8080) 编辑文件
- 开发版本自动检测文件变化并重新编译
- 实时显示编译错误和警告

### 3. 测试验证

- 开发版本API: http://localhost:23769
- 生产版本API: http://localhost:23777
- 使用工具执行接口测试功能

### 4. 构建部署

```bash
# 编译TypeScript
yarn build

# 启动生产版本
yarn start
```

## Docker容器配置

### 容器特性

- **基础镜像**: Ubuntu 22.04
- **Node.js版本**: 22
- **Python版本**: 3.11
- **包管理器**: Yarn
- **镜像源**: 阿里云镜像（加速下载）

### 启动脚本 (start-all.sh)

```bash
# 1. 启动FileBrowser文件浏览器 (8080端口)
# 2. 启动开发版本AIAS Executor (23769端口) - yarn dev
# 3. 启动生产版本AIAS Executor (23777端口) - yarn start
```

### 构建和运行

```bash
# 构建Docker镜像
docker build -t aias-executor .

# 使用Docker Compose运行
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### Docker Compose配置

```yaml
version: '3.8'

services:
  aias-executor:
    build: .
    container_name: aias-executor
    ports:
      - "23777:23777"  # 生产版本API
      - "23769:23769"  # 开发版本API
      - "8080:8080"    # FileBrowser
    volumes:
      - ./workspace:/app/workspace
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - aias-network

networks:
  aias-network:
    driver: bridge
```

### Dockerfile配置

```dockerfile
FROM ubuntu:22.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=22
ENV PYTHON_VERSION=3.11

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    python${PYTHON_VERSION} \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs

# 安装Yarn
RUN npm install -g yarn

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY package.json yarn.lock ./
COPY . .

# 安装依赖
RUN yarn install

# 构建项目
RUN yarn build

# 暴露端口
EXPOSE 23777 23769 8080

# 启动脚本
CMD ["sh", "start-all.sh"]
```

### 开发环境配置

#### 热重载配置

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

#### 开发工具配置

- **ts-node-dev**: TypeScript实时编译和热重载
- **TypeScript配置**: 严格类型检查和ES模块支持
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化

### 多环境支持

#### 开发环境
- 端口: 23769
- 热重载: 启用
- 调试: 启用
- 日志级别: DEBUG

#### 生产环境
- 端口: 23777
- 热重载: 禁用
- 调试: 禁用
- 日志级别: INFO

#### 测试环境
- 端口: 23778
- 热重载: 禁用
- 调试: 部分启用
- 日志级别: WARN

### 部署策略

#### 本地部署
- 使用Docker Compose
- 适合开发和测试
- 快速部署和调试

#### 服务器部署
- 使用Docker Swarm或Kubernetes
- 支持高可用和负载均衡
- 适合生产环境

#### 云平台部署
- 支持AWS、Azure、GCP等云平台
- 自动扩缩容
- 监控和告警集成