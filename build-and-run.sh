#!/bin/bash

echo "构建和运行 AIAS Executor..."
echo "=========================="

# 检查是否在正确目录
if [ ! -f "package.json" ]; then
    echo "错误：请在 aias-executor 目录中运行此脚本"
    exit 1
fi

# 安装依赖
echo "1. 安装依赖..."
npm install

# 构建项目
echo "2. 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo "构建失败，请检查错误信息"
    exit 1
fi

# 设置环境变量
echo "3. 设置环境变量..."
export WORKSPACE_DIR=$(pwd)/workspace
export PORT=23777
export HOST=0.0.0.0
export MAX_FILE_SIZE=10485760
export COMMAND_TIMEOUT=30
export MAX_TERMINALS=10
export PATH_VALIDATION=true
export ALLOWED_COMMANDS="ls,cat,grep,find,pwd,echo,cd,mkdir,rm,cp,mv"
export ALLOWED_EXTENSIONS=".txt,.md,.py,.js,.ts,.java,.cs,.dart,.json"

# 创建工作目录
mkdir -p workspace

echo ""
echo "环境配置:"
echo "  工作目录: $WORKSPACE_DIR"
echo "  服务端口: $PORT"
echo "  绑定地址: $HOST"
echo "  最大文件: $MAX_FILE_SIZE bytes"
echo "  命令超时: $COMMAND_TIMEOUT 秒"
echo "  最大终端: $MAX_TERMINALS"
echo "  路径验证: $PATH_VALIDATION"
echo "  允许命令: $ALLOWED_COMMANDS"
echo "  允许扩展: $ALLOWED_EXTENSIONS"

echo ""
echo "4. 启动服务..."
echo "服务将在 http://$HOST:$PORT 启动"
echo "按 Ctrl+C 停止服务"
echo ""

# 启动服务
npm start