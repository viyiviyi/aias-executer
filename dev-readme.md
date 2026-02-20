# AIAS Executor 项目开发维护指南

## 项目概述

**AIAS Executor** (AI Agent System Executor) 是一个为OpenAI函数调用设计的工具执行器系统。项目采用TypeScript开发，提供完整的文件、系统、网络和MCP协议工具支持，可作为AI代理的后端服务。

## 项目基本信息

### 技术栈
- **语言**: TypeScript 5.3.3
- **运行时**: Node.js 22.22.0
- **Web框架**: Express.js 4.18.2
- **包管理**: Yarn 1.22.22 (同时支持npm)
- **容器化**: Docker + Docker Compose
- **开发工具**: ts-node-dev (热重载)

### 项目结构
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

### 配置信息
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

## 可用工具列表

### 文件操作工具
1. **get_tools_documentation** - 获取工具使用文档
2. **read_file** - 读取文本文件内容
3. **write_file** - 写入文件内容
4. **list_directory** - 获取目录内容
5. **update_file** - 部分更新文件内容（插入/删除行）
6. **read_code** - 读取代码文件（带行号显示）
7. **delete_file** - 删除单个文件或目录
8. **move_file** - 移动文件或目录
9. **delete_files** - 批量删除文件或目录
10. **copy_file** - 复制文件或目录

### 系统工具
1. **execute_command** - 执行命令行命令
2. **create_terminal** - 创建交互式终端会话
3. **terminal_input** - 向终端输入命令
4. **read_terminal_output** - 读取终端输出
5. **close_terminal** - 关闭终端会话
6. **list_terminals** - 列出所有活动终端

### 网络工具
1. **http_request** - 代理HTTP请求

### MCP (Model Context Protocol) 工具
1. **mcp_discover_servers** - 发现MCP服务器
2. **mcp_scan_server** - 扫描MCP服务器
3. **mcp_add_server** - 添加MCP服务器
4. **mcp_call_tool** - 调用MCP工具
5. **mcp_list_tools** - 列出可用MCP工具
6. **mcp_list_servers** - 列出MCP服务器
7. **mcp_start_server** - 启动MCP服务器
8. **mcp_stop_server** - 停止MCP服务器
9. **mcp_get_server_health** - 获取服务器健康状态
10. **mcp_get_connections_status** - 获取连接状态
11. **mcp_cleanup** - 清理MCP资源
12. **mcp_remove_server** - 移除MCP服务器

## MCP协议支持

### 核心特性
- **完整协议实现**: 使用 `@modelcontextprotocol/sdk` 实现真正的MCP协议
- **多传输支持**: STDIO、HTTP、WebSocket传输协议
- **服务器发现**: 自动发现npm、pip、工作空间中的MCP服务器
- **工具动态发现**: 从运行的MCP服务器动态获取工具列表
- **连接管理**: 连接池、心跳检查、错误恢复

### 支持的MCP服务器类型
1. **文件系统**: `@modelcontextprotocol/server-filesystem`
2. **浏览器自动化**: `@modelcontextprotocol/server-browser`
3. **Git操作**: `@modelcontextprotocol/server-git`
4. **Chrome自动化**: `chrome-automation-mcp-full`
5. **Playwright**: `better-playwright-mcp`
6. **Python MCP服务器**: `mcp-server-git`, `mcp-server-postgres`等

### MCP客户端架构
1. **mcp-client.ts**: 服务器发现、扫描、配置管理
2. **mcp-real-client.ts**: 真正的MCP协议通信实现
3. **统一返回值格式**: 所有方法返回 `{success: boolean, result?: any, error?: string}`

## API接口

### 基础接口
- `GET /` - 项目信息
- `GET /health` - 健康检查
- `GET /api/tools` - 获取所有可用工具
- `POST /api/execute` - 执行工具

### 请求格式
```json
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### 响应格式
```json
{
  "success": true,
  "result": "执行结果",
  "error": null
}
```

**注意**: 所有HTTP响应状态码固定为200，符合AI代理调用规范。

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

## 安全特性

### 路径安全
- 所有文件操作限制在 `/app/workspace` 目录内
- 可配置路径验证（当前禁用）
- 防止目录遍历攻击

### 文件大小限制
- 最大文件大小: 5MB (5242880字节)
- 防止大文件操作导致系统资源耗尽

### 命令执行安全
- 命令超时: 300秒
- 最大终端数: 5个
- 可配置允许的命令列表（当前为空，允许所有命令）

## 错误处理机制

### 统一错误格式
```typescript
{
  success: false,
  error: "错误描述",
  result: null
}
```

### 错误类型
1. **参数验证错误**: 工具参数不符合定义
2. **路径验证错误**: 文件路径超出工作空间
3. **文件操作错误**: 文件不存在、权限不足等
4. **命令执行错误**: 命令执行失败或超时
5. **MCP连接错误**: MCP服务器连接失败
6. **系统错误**: 内存不足、磁盘空间不足等

### 错误恢复
- 文件操作失败时回滚
- 命令执行超时自动终止
- MCP连接失败自动重试
- 终端会话异常自动清理

## 性能优化

### 文件操作
- 支持大文件分块读取
- 文件缓存机制
- 异步非阻塞IO操作

### 命令执行
- 命令执行超时控制
- 输出流实时读取
- 资源使用监控

### MCP连接
- 连接池复用
- 心跳保持连接
- 工具列表缓存

## 添加新工具指南

### 步骤1: 创建工具实现
在 `/workspace/src/tools/` 相应目录创建 `.ts` 文件：
```typescript
import { Tool } from '../../core/tool-registry';

export const myTool: Tool = {
  definition: {
    name: 'my_tool',
    description: '工具描述',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '参数1' }
      },
      required: ['param1']
    }
  },

  async execute(parameters: Record<string, any>): Promise<string> {
    // 工具实现逻辑
    return JSON.stringify({ success: true, result: '执行结果' });
  }
};
```

### 步骤2: 注册工具
在 `/workspace/src/tools/index.ts` 中：
1. 导入新工具
2. 在 `registerAllTools()` 中注册
3. 在 `allTools` 对象中导出

### 步骤3: 测试工具
1. 保存文件，开发版本自动重新编译
2. 使用API接口测试工具功能
3. 验证错误处理和边界情况

## 故障排除

### 常见问题

1. **工具未注册**
   - 检查 `src/tools/index.ts` 是否正确导入和注册
   - 查看编译输出是否有错误

2. **编译错误**
   - 检查TypeScript类型和语法
   - 查看 `dev.log` 中的编译错误信息

3. **服务启动失败**
   - 检查端口是否被占用
   - 查看Docker Compose日志
   - 验证依赖是否安装完整

4. **热重载不工作**
   - 检查文件是否在监控范围内
   - 查看ts-node-dev日志
   - 重启开发服务

5. **MCP连接失败**
   - 检查MCP服务器是否安装
   - 验证传输协议配置
   - 查看连接状态日志

### 调试步骤
1. 检查服务运行状态
2. 查看相关日志文件
3. 使用API接口测试功能
4. 验证配置文件是否正确
5. 检查文件权限和路径

## 维护最佳实践

### 代码质量
- 遵循TypeScript最佳实践
- 添加适当的注释和文档
- 保持代码简洁和可维护
- 使用ESLint和Prettier保持代码风格一致

### 版本控制
- 每次更新后更新文档
- 记录重要的架构变更
- 保持向后兼容性
- 使用语义化版本控制

### 测试验证
- 添加单元测试
- 集成测试关键功能
- 性能测试大文件操作
- 安全测试路径验证

## 未来改进方向

### 功能增强
1. **更多文件操作工具**
   - 文件压缩/解压
   - 文件搜索
   - 文件比较
   - 批量重命名

2. **增强现有工具**
   - 文件操作进度显示
   - 命令执行历史记录
   - 终端会话持久化

3. **新工具类型**
   - 数据库操作工具
   - 消息队列工具
   - 缓存操作工具
   - 监控指标工具

### 性能优化
1. **大文件处理优化**
   - 流式处理大文件
   - 内存使用优化
   - 并行处理支持

2. **缓存机制增强**
   - 文件内容缓存
   - 工具结果缓存
   - 连接池优化

3. **并发处理改进**
   - 异步任务队列
   - 资源限制管理
   - 负载均衡支持

### 安全性增强
1. **权限控制**
   - 用户认证和授权
   - 操作审计日志
   - 敏感数据保护

2. **输入验证**
   - 增强参数验证
   - 防止注入攻击
   - 文件类型限制

3. **监控告警**
   - 系统资源监控
   - 异常行为检测
   - 自动告警机制

### 开发体验
1. **开发工具增强**
   - 更详细的热重载状态
   - 开发调试工具
   - 性能分析工具

2. **文档完善**
   - API文档自动生成
   - 使用示例丰富
   - 故障排除指南

3. **部署简化**
   - 一键部署脚本
   - 配置管理工具
   - 版本升级工具

---

**项目名称**: AIAS Executor  
**版本**: 1.0.0  
**最后更新**: 2026-02-20  
**当前状态**: 开发版本运行中 (端口: 23769)  
**工作目录**: `/app/workspace`  
**配置文件**: `/workspace/config/config.json`