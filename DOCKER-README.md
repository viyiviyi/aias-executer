# AIAS Executor Docker 部署指南

本文档介绍如何使用Docker部署AIAS Executor项目。

## 文件说明

### 1. Dockerfile
基于Ubuntu 22.04的Docker镜像，包含：
- Node.js 22 环境
- Yarn 包管理器
- Python 3.11 环境
- 所有镜像源配置为阿里云（加速下载）
- 自动构建和运行TypeScript项目

### 2. docker-compose.yml
Docker Compose配置文件，包含：
- 服务定义和端口映射（3000:3000）
- 环境变量配置
- 健康检查
- 资源限制
- 日志配置
- 网络配置

### 3. .dockerignore
排除不必要的文件，优化Docker构建：
- 开发环境文件
- 测试文件
- 日志文件
- 构建产物
- IDE配置文件

### 4. docker-build-run.txt
Docker管理脚本（重命名为.sh后使用）

## 快速开始

### 方法一：使用Docker Compose（推荐）

1. **构建并启动**
   ```bash
   docker-compose up -d --build
   ```
   或使用docker compose（新版本）：
   ```bash
   docker compose up -d --build
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

### 方法二：使用管理脚本

1. **重命名脚本为.sh扩展名**
   ```bash
   mv docker-build-run.txt docker-build-run.sh
   chmod +x docker-build-run.sh
   ```

2. **构建并启动**
   ```bash
   ./docker-build-run.sh all
   ```

3. **其他命令**
   ```bash
   # 构建镜像
   ./docker-build-run.sh build
   
   # 启动容器
   ./docker-build-run.sh start
   
   # 停止容器
   ./docker-build-run.sh stop
   
   # 查看日志
   ./docker-build-run.sh logs
   
   # 进入容器
   ./docker-build-run.sh shell
   
   # 清理所有资源
   ./docker-build-run.sh clean
   ```

### 方法三：直接使用Docker命令

1. **构建镜像**
   ```bash
   docker build -t aias-executor:latest .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name aias-executor \
     -p 3000:3000 \
     --restart unless-stopped \
     aias-executor:latest
   ```

## 配置说明

### 端口配置
- 容器内部端口：3000
- 映射到主机端口：3000
- 可根据需要修改`docker-compose.yml`中的端口映射

### 环境变量
- `NODE_ENV=production`：生产环境
- `TZ=Asia/Shanghai`：时区设置

### 镜像源配置
所有包管理器都已配置为阿里云镜像源：
1. **Ubuntu APT源**：mirrors.aliyun.com
2. **npm/Yarn源**：registry.npmmirror.com
3. **pip源**：mirrors.aliyun.com/pypi/simple

### 健康检查
容器配置了健康检查，每30秒检查一次应用状态：
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 开发环境使用

### 热重载开发
在`docker-compose.yml`中已经配置了源代码挂载，修改代码后会自动生效：

```yaml
volumes:
  - ./src:/app/src
  - ./package.json:/app/package.json
  - ./yarn.lock:/app/yarn.lock
```

### 开发模式
如果需要开发模式，可以取消注释`docker-compose.yml`中的开发配置部分。

## 生产环境部署建议

1. **移除开发挂载**：生产环境注释掉源代码挂载
2. **使用环境变量文件**：创建`.env`文件管理敏感配置
3. **配置资源限制**：根据实际需求调整CPU和内存限制
4. **设置日志轮转**：已配置日志文件最大10MB，保留3个文件
5. **使用健康检查**：确保应用正常运行

## 故障排除

### 1. 构建失败
- 检查网络连接，确保能访问阿里云镜像源
- 检查Dockerfile语法是否正确
- 查看详细错误信息：`docker-compose build --no-cache`

### 2. 容器启动失败
- 检查端口是否被占用：`netstat -tulpn | grep 3000`
- 查看容器日志：`docker-compose logs aias-executor`
- 检查应用配置是否正确

### 3. 健康检查失败
- 确保应用提供了`/health`端点
- 检查应用是否正常启动
- 增加健康检查的超时时间

### 4. 性能问题
- 调整资源限制：修改`docker-compose.yml`中的`deploy.resources`
- 优化Dockerfile构建层
- 使用多阶段构建减少镜像大小

## 安全建议

1. **不要以root用户运行**：Dockerfile中已使用非root用户
2. **定期更新基础镜像**：保持Ubuntu和Node.js版本更新
3. **扫描镜像漏洞**：使用`docker scan`命令
4. **限制容器权限**：避免使用`--privileged`标志
5. **使用私有镜像仓库**：生产环境使用私有仓库存储镜像

## 扩展功能

### 多阶段构建
如果需要更小的镜像，可以修改Dockerfile使用多阶段构建。

### 数据库集成
如果需要数据库，可以在`docker-compose.yml`中添加数据库服务。

### 反向代理
建议使用Nginx或Traefik作为反向代理，处理SSL和负载均衡。

## 联系方式

如有问题，请参考项目主README或提交Issue。