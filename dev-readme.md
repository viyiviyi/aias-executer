# AIAS Executor 项目开发维护指南

## 简介

**AIAS Executor** (AI Agent System Executor) 是一个为OpenAI函数调用设计的工具执行器系统。项目采用TypeScript开发，提供完整的文件、系统、网络和MCP协议工具支持，可作为AI代理的后端服务。

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

## 快速开始

### 环境准备
```bash
# 进入项目目录
cd /workspace

# 安装依赖
yarn install

# 启动开发服务
yarn dev
```

### 服务访问
- **开发版本API**: http://localhost:23769
- **生产版本API**: http://localhost:23777
- **文件浏览器**: http://localhost:8080

### 常用命令
```bash
# 编译项目
yarn build

# 启动生产版本
yarn start

# 使用Docker运行
docker-compose up -d

# windows 服务方式运行时重启 11重启前必须能编译通过，否则会导致服务不能重启
cd win-server
aias-executer.exe restart
```

## 项目状态

**项目名称**: AIAS Executor  
**版本**: 1.0.0  
**最后更新**: 2026-02-22  
**当前状态**: 开发版本运行中 (端口: 23769)  
**工作目录**: `/app/workspace`

## 更新日志

### 2026-02-22
- 文档重构：将单一dev-readme.md按功能分解为多个文档
- 创建dev-docs目录，包含9个功能模块文档
- 优化文档结构，提高可读性和维护性

### 2026-02-20
- 初始版本发布
- 支持文件、系统、网络、MCP工具
- 实现自启动脚本功能

## 贡献指南

1. 阅读相关功能文档了解项目架构
2. 遵循开发工作流程进行代码修改
3. 参考添加新工具指南创建新功能
4. 按照维护最佳实践提交代码
5. 更新相关文档记录变更

## 获取帮助

- 查看故障排除文档解决常见问题
- 参考API文档了解接口使用方法
- 如有其他问题，请查看详细功能文档

---


### 2026-02-23
- **MCP工具加载机制重构**：
  - 修改MCP工具管理器，不再自动将MCP工具注册到全局工具列表
  - 新增两个专用工具：
    - `get_third_party_tools`：获取所有第三方工具（MCP工具）列表
    - `execute_third_party_tool`：执行第三方工具（MCP工具）
  - 工具名称格式：`serverName__toolName`
  - 保持MCP服务器自动启动和工具发现功能
  - 提供更好的工具管理和隔离

### 2026-02-23
- 添加重启服务工具 `restart_service`
- 功能：检查编译并安全重启当前服务
- 支持环境：Docker、Windows服务、systemd、开发环境
- 原理：通过优雅退出让外部进程管理器自动重启
- 安全特性：编译检查、频率记录、环境检测

### 2026-02-22 (当前)
- 自启动脚本功能增强：支持从配置的工作目录加载脚本
- 修改自启动管理器，优先使用工作目录的autoStart目录
- 更新配置文件，添加自启动脚本配置支持
- 创建工作目录autoStart目录并添加开发文档
- 添加配置感知示例脚本

### 2026-02-22
- 文档重构：将单一dev-readme.md按功能分解为多个文档
- 创建dev-docs目录，包含10个功能模块文档
- 优化文档结构，提高可读性和维护性
**文档版本**: 2.0.0  
**文档结构**: 模块化分解  
**最后更新**: 2026-02-22  
**维护状态**: 活跃维护中