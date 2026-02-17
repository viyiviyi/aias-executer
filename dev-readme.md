# 项目开发维护指南

## 项目概述
这是一个可以维护当前tools的项目，以自举的形式维护自身。项目目录在/workspace，运行在容器内部。

## 最新更新 (2026-02-17)

### 新增功能
已成功添加三个新的文件操作工具到正确的工作空间 `/workspace`：

1. **delete_file** - 删除文件或目录
2. **move_file** - 移动文件或目录  
3. **copy_file** - 复制文件或目录

### 技术实现
- **源代码位置**: `/workspace/src/tools/file/`
  - `delete-file.ts` - 删除文件工具
  - `move-file.ts` - 移动文件工具
  - `copy-file.ts` - 复制文件工具
- **编译输出**: `/workspace/dist/tools/file/`
  - `delete-file.js` - 编译后的删除文件工具
  - `move-file.js` - 编译后的移动文件工具
  - `copy-file.js` - 编译后的复制文件工具
- **工具注册**: `/workspace/src/tools/index.ts` 已更新并重新编译

### 配置文件
- `/workspace/config/config.json` 已允许 `.ts` 文件扩展名
- 工作空间目录配置正确：`/app/workspace`

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
└── workspace/             # 工作空间（用户文件）
```

### 工具架构
1. **工具定义**: 每个工具都是一个独立的 TypeScript 文件
2. **工具注册**: 所有工具在 `src/tools/index.ts` 中注册
3. **配置管理**: 使用 `ConfigManager` 进行路径验证和安全控制
4. **工具执行**: 通过 `ToolRegistry` 统一管理和执行工具

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

### 3. 重新编译项目
```bash
cd /workspace
npm run build
```

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
2. **编译错误**: 检查 TypeScript 类型和语法
3. **权限问题**: 检查文件权限和路径访问

### 调试步骤
1. 检查编译输出是否包含新工具
2. 验证工具定义是否正确
3. 测试工具执行逻辑

## 未来改进方向

### 功能增强
1. 添加更多文件操作工具（如压缩、解压）
2. 增强现有工具的功能
3. 添加批量操作支持

### 性能优化
1. 优化大文件处理
2. 添加缓存机制
3. 改进并发处理

### 安全性增强
1. 添加操作审计日志
2. 增强权限控制
3. 添加操作确认机制

---

**最后更新**: 2026-02-17  
**维护者**: AI Assistant  
**版本**: 1.2 (在正确的工作空间添加了文件操作工具)