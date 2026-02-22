# 项目结构和运行状态

## 项目结构

```
/workspace/
├── src/                    # 源代码目录
│   ├── core/              # 核心模块
│   │   ├── config.ts      # 配置管理器
│   │   ├── executor.ts    # 工具执行器
│   │   ├── mcp-client.ts  # MCP客户端（服务器发现和扫描）
│   │   ├── mcp-real-client.ts # 真实MCP客户端（协议实现）
│   │   └── tool-registry.ts # 工具注册表
│   ├── tools/             # 工具实现
│   │   ├── file/          # 文件操作工具
│   │   ├── system/        # 系统工具
│   │   ├── network/       # 网络工具
│   │   └── mcp/           # MCP协议工具
│   ├── api/               # API路由
│   ├── types/             # 类型定义
│   └── index.ts           # 主入口文件
├── config/                # 配置文件目录
│   └── config.json        # 应用配置
├── dist/                  # TypeScript编译输出
├── data/                  # 数据存储目录
├── logs/                  # 日志文件目录
├── workspace/             # 用户工作空间目录
├── Dockerfile            # Docker容器配置
├── docker-compose.yml    # 服务编排配置
├── start-all.sh          # 多服务启动脚本
├── package.json          # 项目配置
└── yarn.lock             # Yarn依赖锁文件
```

## 当前运行状态

### 多服务架构

项目同时运行**三个服务**：

1. **FileBrowser文件浏览器** (端口: 8080)
   - Web界面访问 `/app/workspace` 目录
   - 无认证模式，直接访问
   - 提供文件管理和编辑功能

2. **生产版本AIAS Executor** (端口: 23777)
   - 运行在 `/app` 目录
   - 使用 `yarn start` 启动编译后的生产代码
   - 提供稳定的API服务

3. **开发版本AIAS Executor** (端口: 23769)
   - 运行在 `/workspace` 目录
   - 使用 `yarn dev` 启动，支持热重载
   - 使用 `ts-node-dev` 实时编译TypeScript
   - **当前正在运行**（从dev.log可见）