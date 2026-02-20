#!/bin/bash

# 启动所有服务的脚本
# 1. FileBrowser文件浏览器
# 2. 生产版本AIAS Executor (23777端口) - yarn start
# 3. 开发版本AIAS Executor (23769端口) - yarn dev (支持热重载)

set -e

echo "=========================================="
echo "AIAS Executor 多服务启动脚本"
echo "=========================================="

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p /app/data/filebrowser /app/workspace /app/logs

# 启动FileBrowser文件浏览器
echo "启动FileBrowser文件浏览器..."
filebrowser \
    --port=8080 \
    --address=0.0.0.0 \
    --root=/app/workspace \
    --database=/app/data/filebrowser/filebrowser.db \
    --log=/app/logs/filebrowser.log \
    -b /fs \
    --noauth &

# 等待FileBrowser启动
sleep 2

# 启动开发版本AIAS Executor (23769端口) - 使用 yarn dev 支持热重载
echo "启动开发版本AIAS Executor (23769端口) - yarn dev..."
cd /workspace

# 检查是否有node_modules，如果没有则安装依赖
if [ ! -d "node_modules" ]; then
    echo "安装开发环境依赖..."
    yarn install --frozen-lockfile --network-timeout 100000
fi

# 设置开发环境变量并启动
NODE_ENV=development PORT=23769 yarn dev > dev.log &

# 等待dev服务启动
sleep 2

# 启动生产版本AIAS Executor (23777端口) - 使用 yarn start
echo "启动生产版本AIAS Executor (23777端口) - yarn start..."
cd /app
yarn start