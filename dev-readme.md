# 项目开发维护指南

## 项目概述
这是一个可以维护当前tools的项目，以自举的形式维护自身。项目目录在/workspace，运行在容器内部。

## 最新更新 (2026-02-20)

### 多服务容器配置（支持热重载，使用yarn）
已成功配置多服务容器，包含以下服务：

1. **FileBrowser文件浏览器** (8080端口)
   - 提供Web界面浏览和管理文件
   - 根目录为 `/app/workspace`
   - 无需认证，直接访问

2. **生产版本AIAS Executor** (23777端口)
   - 运行在 `/app` 目录
   - 使用 `yarn start` 启动编译后的生产版本代码
   - 提供稳定的API服务

3. **开发版本AIAS Executor** (23769端口)
   - 运行在 `/workspace` 目录
   - 使用 `yarn dev` 启动，支持热重载和自动编译
   - 使用 `ts-node-dev` 实时编译TypeScript代码

### 技术实现
- **Dockerfile更新**: 添加FileBrowser安装和多服务启动脚本，使用yarn进行包管理
- **启动脚本**: `start-all.sh` 管理三个服务的启动，使用yarn命令
- **端口映射**: 23777(生产), 23769(开发), 8080(文件浏览器)
- **包管理器**: 统一使用yarn，不使用npm
- **开发工具**: 使用 `ts-node-dev` 支持TypeScript热重载
- **目录结构**:
  - `/app`: 生产版本代码和运行环境
  - `/workspace`: 源代码和开发环境
  - `/app/workspace`: 用户工作空间

### 热重载特性
开发版本 (`yarn dev`) 具有以下特性：
- 自动检测文件变化
- 实时重新编译TypeScript代码
- 自动重启服务
- 显示编译错误和警告
- 保持开发会话状态

### MCP工具重构 (2026-02-19)
已成功将MCP工具拆分成多个文件，并通过index文件注册，同时统一了返回值格式：

1. **文件拆分**: 将 `mcp-tools.ts` 拆分成9个单独的文件
2. **统一注册**: 创建 `mcp/index.ts` 统一导出所有MCP工具
3. **标准返回值**: 所有MCP工具现在返回标准格式 `{success: boolean, result: any, error?: string}`

### MCP客户端更新
- `discoverServers()`: 现在返回 `{success: boolean, servers: [...]}`
- `listTools()`: 现在返回 `{success: boolean, tools: [...], count: number}`
- `listServers()`: 现在返回 `{success: boolean, servers: [...], count: number}`
- 所有方法都包含错误处理，返回统一的格式

## 项目结构

### 核心目录
```
/workspace
├── src/                    # 源代码
│   ├── core/              # 核心模块
│   ├── tools/             # 工具实现
│   │   ├── file/          # 文件操作工具
│   │   ├── system/        # 系统工具
│   │   ├── network/       # 网络工具
│   │   └── mcp/           # MCP工具
│   ├── api/               # API接口
│   └── types/             # 类型定义
├── dist/                  # 编译输出
├── config/                # 配置文件
├── workspace/             # 工作空间（用户文件）
├── Dockerfile            # 多服务容器配置（使用yarn）
├── docker-compose.yml    # 服务编排配置
├── start-all.sh          # 多服务启动脚本（使用yarn）
├── test-config.sh        # 配置测试脚本
├── build-and-run-multi.sh # 一键构建运行脚本
├── package.json          # 项目配置
└── yarn.lock             # Yarn锁文件
```

### 工具架构
1. **工具定义**: 每个工具都是一个独立的 TypeScript 文件
2. **工具注册**: 所有工具在 `src/tools/index.ts` 中注册
3. **配置管理**: 使用 `ConfigManager` 进行路径验证和安全控制
4. **工具执行**: 通过 `ToolRegistry` 统一管理和执行工具

## 多服务使用指南

### 快速启动
```bash
cd /workspace
./build-and-run-multi.sh
```

### 访问服务
- **FileBrowser文件浏览器**: http://localhost:8080
- **生产版本API**: http://localhost:23777 (`yarn start`)
- **开发版本API**: http://localhost:23769 (`yarn dev`)

### 服务管理
```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps
```

### 开发工作流程
1. **编辑代码**: 通过FileBrowser (8080端口) 浏览和编辑文件
2. **实时编译**: 开发版本自动检测文件变化并重新编译
3. **测试功能**: 使用开发版本API (23769端口) 测试新功能
4. **验证稳定性**: 使用生产版本API (23777端口) 验证稳定性
5. **查看日志**: 使用 `docker-compose logs -f` 监控编译和运行状态

### 热重载特性
开发版本使用 `ts-node-dev` 提供以下功能：
- **自动重载**: 保存文件后自动重启服务
- **错误恢复**: 编译错误修复后自动恢复
- **快速反馈**: 实时显示编译状态和错误信息
- **开发效率**: 无需手动停止和重启服务

## 包管理器说明

### 使用yarn而不是npm
项目统一使用yarn进行包管理，具有以下优势：
- **确定性安装**: 使用yarn.lock确保依赖版本一致
- **并行安装**: 更快地安装依赖
- **离线模式**: 支持离线安装
- **更好的缓存**: 更高效的依赖缓存机制

### 相关命令
```bash
# 安装依赖
yarn install

# 安装特定依赖
yarn add <package-name>

# 安装开发依赖
yarn add -D <package-name>

# 运行脚本
yarn <script-name>

# 构建项目
yarn build

# 开发模式（热重载）
yarn dev

# 生产模式
yarn start
```

## 新工具详情

### 1. delete_file - 删除文件或目录
**功能**:
- 删除单个文件
- 删除空目录
- 递归删除目录及其内容（需要 recursive=true）
- 强制删除（忽略不存在的文件错误，使用 force=true）

**参数**:
- `path` (必需): 要删除的文件或目录路径
- `recursive` (可选, 默认false): 是否递归删除目录内容
- `force` (可选, 默认false): 是否强制删除（忽略不存在的文件错误）

### 2. move_file - 移动文件或目录
**功能**:
- 移动文件或目录到新位置
- 重命名文件或目录
- 支持覆盖已存在的目标文件（使用 overwrite=true）
- 自动创建目标目录的父目录（使用 create_parents=true）

**参数**:
- `source` (必需): 源文件或目录路径
- `destination` (必需): 目标路径
- `overwrite` (可选, 默认false): 是否覆盖已存在的目标文件
- `create_parents` (可选, 默认true): 是否自动创建目标目录的父目录

### 3. copy_file - 复制文件或目录
**功能**:
- 复制文件到新位置
- 递归复制目录及其内容（默认 recursive=true）
- 支持覆盖已存在的目标文件（使用 overwrite=true）
- 自动创建目标目录的父目录（使用 create_parents=true）

**参数**:
- `source` (必需): 源文件或目录路径
- `destination` (必需): 目标路径
- `overwrite` (可选, 默认false): 是否覆盖已存在的目标文件
- `recursive` (可选, 默认true): 是否递归复制目录内容
- `create_parents` (可选, 默认true): 是否自动创建目标目录的父目录

## 添加新工具的步骤

### 1. 创建工具实现文件
在 `/workspace/src/tools/` 相应目录下创建 `.ts` 文件，例如：
```typescript
import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const myTool: Tool = {
  definition: {
    name: 'my_tool',
    description: '工具描述',
    parameters: {
      type: 'object',
      properties: {
        // 参数定义
      },
      required: ['必需参数']
    }
  },

  async execute(parameters: Record<string, any>): Promise<string> {
    // 工具实现逻辑
  }
};
```

### 2. 更新工具索引
在 `/workspace/src/tools/index.ts` 中：
1. 导入新工具
2. 在 `registerAllTools()` 函数中注册工具
3. 在 `allTools` 对象中导出工具

### 3. 测试新工具
1. 保存文件，开发版本会自动重新编译
2. 使用开发版本API测试新工具功能
3. 验证错误处理和边界情况

## 安全注意事项

### 路径安全
- 所有文件操作都限制在工作空间内（`/app/workspace`）
- 使用 `ConfigManager.validatePath()` 验证路径
- 防止目录遍历攻击

### 文件类型限制
- 使用 `ConfigManager.validateFileExtension()` 验证文件扩展名
- 配置文件控制允许的文件类型

### 命令执行安全
- 限制可执行的命令列表
- 防止命令注入攻击

## 测试指南

### 测试文件位置
- 测试文件应创建在 `/workspace/workspace/` 目录下
- 这是配置的工作空间目录

### 手动测试步骤
1. 在工作空间创建测试文件
2. 测试每个工具的功能
3. 验证错误处理

## 维护最佳实践

### 代码质量
1. 遵循 TypeScript 最佳实践
2. 添加适当的注释和文档
3. 保持代码简洁和可维护

### 版本控制
1. 每次更新后更新此文档
2. 记录重要的架构变更
3. 保持向后兼容性

### 错误处理
1. 提供清晰的错误消息
2. 记录详细的错误日志
3. 实现适当的恢复机制

## 故障排除

### 常见问题
1. **工具未注册**: 检查 `src/tools/index.ts` 是否正确导入和注册
2. **编译错误**: 检查 TypeScript 类型和语法，开发版本会实时显示错误
3. **权限问题**: 检查文件权限和路径访问
4. **服务启动失败**: 检查端口是否被占用，查看docker-compose日志
5. **热重载不工作**: 检查文件是否在监控范围内，查看ts-node-dev日志
6. **yarn安装失败**: 检查网络连接，或使用 `--network-timeout` 参数

### 调试步骤
1. 检查编译输出是否包含新工具
2. 验证工具定义是否正确
3. 测试工具执行逻辑
4. 使用 `docker-compose logs` 查看服务日志
5. 检查开发版本的热重载日志

## 未来改进方向

### 功能增强
1. 添加更多文件操作工具（如压缩、解压）
2. 增强现有工具的功能
3. 添加批量操作支持

### 性能优化
1. 优化大文件处理
2. 添加缓存机制
3. 改进并发处理

### 开发体验
1. 添加更详细的热重载状态显示
2. 支持自定义文件监控规则
3. 添加开发调试工具

### 安全性增强
1. 添加操作审计日志
2. 增强权限控制
3. 添加操作确认机制

---

**最后更新**: 2026-02-20  
**维护者**: AI Assistant  
**版本**: 1.5 (统一使用yarn进行包管理，移除npm依赖)