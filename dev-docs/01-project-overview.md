# AIAS Executor 项目概述

## 项目简介

**AIAS Executor** (AI Agent System Executor) 是一个为OpenAI函数调用设计的工具执行器系统。项目采用TypeScript开发，提供完整的文件、系统、网络和MCP协议工具支持，可作为AI代理的后端服务。

## 技术栈

- **语言**: TypeScript 5.3.3
- **运行时**: Node.js 22.22.0
- **Web框架**: Express.js 4.18.2
- **包管理**: Yarn 1.22.22 (同时支持npm)
- **容器化**: Docker + Docker Compose
- **开发工具**: ts-node-dev (热重载)

## 项目基本信息

**项目名称**: AIAS Executor  
**版本**: 1.0.0  
**最后更新**: 2026-02-20  
**当前状态**: 开发版本运行中 (端口: 23769)  
**工作目录**: `/app/workspace`

## 配置信息

```json
{
  "server": {
    "port": 23777,
    "host": "0.0.0.0"
  },
  "workspace": {
    "dir": "/app/workspace",
    "maxFileSize": 5242880,
    "pathValidation": false
  },
  "command": {
    "timeout": 300,
    "allowedCommands": [],
    "maxTerminals": 5
  }
}
```