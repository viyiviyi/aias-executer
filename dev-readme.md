# AIAS Executor 项目开发维护指南

## 简介

**AIAS Executor** (AI Agent System Executor) 是一个符合OpenAI function calls的MCP服务，一切功能都需要尽可能利于ai使用，比如操作结果清晰精简不容易污染上下文、函数说明语义准确有效。

本文档是AIAS Executor项目的开发维护指南目录。详细文档已按功能分解到 `dev-docs/` 目录中。

## 文档目录

### 基础文档
1. **[项目概述](dev-docs/01-project-overview.md)** - 项目简介、技术栈、配置信息
2. **[项目结构](dev-docs/02-project-structure.md)** - 项目目录结构、运行状态、多服务架构

### 功能文档
3. **[工具和API](dev-docs/03-tools-and-api.md)** - 可用工具列表、API接口规范
4. **[MCP协议支持](dev-docs/04-mcp-support.md)** - MCP协议实现、服务器支持、客户端架构
5. **[自启动脚本](dev-docs/10-autostart-scripts.md)** - 自启动脚本功能、使用方法、技术实现

### 开发文档
6. **[开发工作流程](dev-docs/05-development-workflow.md)** - 环境准备、代码编辑、Docker配置
7. **[性能优化和新工具](dev-docs/07-performance-and-new-tools.md)** - 性能优化策略、添加新工具指南

### 运维文档
8. **[安全和错误处理](dev-docs/06-security-and-error-handling.md)** - 安全特性、错误处理机制、监控告警
9. **[故障排除和最佳实践](dev-docs/08-troubleshooting-and-best-practices.md)** - 常见问题解决、维护最佳实践
### 重构文档
10. **[工具模块重构总结](dev-docs/工具模块重构总结.md)** - 终端功能拆分、浏览器常量分离、模块化设计


## 开发

### 项目结构
```
aias-executor/
├── src/
│   ├── core/          # 核心模块 核心逻辑
│   │   ├── config.ts      # 配置管理
│   │   ├── executor.ts    # 工具执行器
│   │   ├── tool-registry.ts # 工具注册表
│   │   └── mcp-client.ts  # MCP客户端
│   ├── tools/         # 工具实现
│   │   ├── file/      # 文件工具
│   │   ├── system/    # 系统工具
│   │   ├── network/   # 网络工具
│   ├── api/           # API接口
│   ├── types/         # TypeScript类型定义
│   └── index.ts       # 应用入口
├── package.json
├── tsconfig.json
└── README.md
```

### 添加新工具

1. 在 `src/tools/` 下创建工具文件，
2. 实现 `Tool` 接口
3. 在 `src/tools/index.ts` 中注册工具
4. 重新启动服务

提示：
- Tool定义在src/types/Tool.ts
- 工具和核心逻辑分别存在src/tools/和src/core/
- 按文件区分和存放单一功能，按文件夹区和存放分同类功能
- tool内一切操作都应该基于config.ts配置的工作目录
