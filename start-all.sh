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

# 启动生产版本AIAS Executor (23777端口) - 使用 yarn start
echo "启动生产版本AIAS Executor (23777端口) - yarn start..."
cd /app
yarn start &

# 等待生产版本启动
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
NODE_ENV=development PORT=23769 yarn dev &

# 等待所有服务启动
echo "等待所有服务启动..."
sleep 5

# 检查服务状态
echo "检查服务状态..."
echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "访问地址："
echo "  - FileBrowser文件浏览器: http://localhost:8080"
echo "  - 生产版本API (23777端口): http://localhost:23777"
echo "  - 开发版本API (23769端口): http://localhost:23769"
echo ""
echo "服务说明："
echo "  - 生产版本: 使用 yarn start，运行编译后的稳定代码"
echo "  - 开发版本: 使用 yarn dev，支持热重载和自动编译"
echo ""
echo "日志文件："
echo "  - FileBrowser日志: /app/logs/filebrowser.log"
echo "  - 生产版本日志: 标准输出"
echo "  - 开发版本日志: 标准输出（包含编译信息）"
echo ""
echo "查看进程："
echo "  ps aux | grep -E '(filebrowser|node)'"
echo ""
echo "停止所有服务："
echo "  pkill -f 'filebrowser|node'"

# 保持容器运行
wait