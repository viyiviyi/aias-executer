# 批量删除文件功能 (delete_files)

## 概述

新增的 `delete_files` 工具提供了批量删除文件或目录的能力，支持递归删除、强制删除以及错误处理控制。这是对原有 `delete_file` 工具的扩展，专门用于批量操作场景。

## 功能特点

1. **批量操作**: 一次性删除多个文件或目录
2. **错误控制**: 支持 `continue_on_error` 参数，控制是否在某个项目失败时继续处理其他项目
3. **详细报告**: 提供每个项目的执行结果和汇总统计
4. **向后兼容**: 保留了原有的 `delete_file` 工具，不影响现有功能
5. **灵活配置**: 每个项目可以独立设置 `recursive` 和 `force` 参数

## 工具定义

```json
{
  "name": "delete_files",
  "description": "批量删除文件或目录，支持递归删除和强制删除",
  "parameters": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "要删除的文件或目录路径（相对于工作目录）"
            },
            "recursive": {
              "type": "boolean",
              "description": "是否递归删除目录及其内容（可选，默认false）",
              "default": false
            },
            "force": {
              "type": "boolean",
              "description": "是否强制删除（忽略不存在的文件错误，可选，默认false）",
              "default": false
            }
          },
          "required": ["path"]
        },
        "description": "要删除的文件或目录列表"
      },
      "continue_on_error": {
        "type": "boolean",
        "description": "当某个项目删除失败时是否继续处理其他项目（可选，默认false）",
        "default": false
      },
      "summary_only": {
        "type": "boolean",
        "description": "是否只返回汇总信息而不返回每个项目的详细结果（可选，默认false）",
        "default": false
      }
    },
    "required": ["items"]
  }
}
```

## 使用示例

### 示例1: 批量删除多个文件

```json
{
  "items": [
    { "path": "/tmp/file1.txt" },
    { "path": "/tmp/file2.txt" },
    { "path": "/tmp/old-backup.zip" }
  ],
  "continue_on_error": true,
  "summary_only": false
}
```

### 示例2: 混合删除文件和目录

```json
{
  "items": [
    { "path": "/tmp/logs/app.log" },
    { "path": "/tmp/cache", "recursive": true },
    { "path": "/tmp/empty-dir", "recursive": false },
    { "path": "/tmp/maybe-exists.txt", "force": true }
  ],
  "continue_on_error": false,
  "summary_only": true
}
```

### 示例3: 清理临时文件

```json
{
  "items": [
    { "path": "/tmp/temp-file-*.txt", "force": true },
    { "path": "/tmp/.cache", "recursive": true },
    { "path": "/tmp/backup-2024-01-01", "recursive": true }
  ],
  "continue_on_error": true,
  "summary_only": false
}
```

## 返回结果格式

### 详细结果模式 (`summary_only: false`)

```json
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 1,
    "success_rate": "80.00%"
  },
  "details": [
    {
      "index": 0,
      "path": "/tmp/file1.txt",
      "success": true,
      "message": "文件删除成功"
    },
    {
      "index": 1,
      "path": "/tmp/file2.txt",
      "success": true,
      "message": "文件删除成功"
    },
    {
      "index": 2,
      "path": "/tmp/non-empty-dir",
      "success": false,
      "message": "删除失败",
      "error": "目录不为空。使用 recursive=true 来删除非空目录"
    },
    {
      "index": 3,
      "path": "/tmp/empty-dir",
      "success": true,
      "message": "目录删除成功"
    },
    {
      "index": 4,
      "path": "/tmp/not-exists.txt",
      "success": true,
      "message": "路径不存在，由于 force=true，操作成功完成"
    }
  ]
}
```

### 简洁结果模式 (`summary_only: true`)

```json
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 1,
    "success_rate": "80.00%"
  }
}
```

## 错误处理

### `continue_on_error: false` (默认)
- 当任何一个项目删除失败时，立即停止处理并抛出错误
- 适用于需要原子性操作的场景

### `continue_on_error: true`
- 当某个项目删除失败时，记录错误并继续处理其他项目
- 返回结果中包含所有成功和失败的项目详情
- 适用于批量清理等容错性较高的场景

## 与原有 `delete_file` 工具的对比

| 特性 | `delete_file` | `delete_files` |
|------|---------------|----------------|
| 批量操作 | ❌ 单个文件/目录 | ✅ 多个文件/目录 |
| 错误继续 | ❌ 失败即停止 | ✅ 可配置是否继续 |
| 结果汇总 | ❌ 简单消息 | ✅ 详细统计和报告 |
| 参数配置 | ✅ 单个配置 | ✅ 每个项目独立配置 |
| 向后兼容 | ✅ 保持不变 | ✅ 新增工具 |

## 最佳实践

1. **测试环境**: 在生产环境使用前，先在测试环境验证删除操作
2. **备份重要数据**: 批量删除前确保有重要数据的备份
3. **使用 `force: true` 谨慎**: 仅在确定可以忽略不存在的文件时使用
4. **监控磁盘空间**: 批量删除大文件后，监控磁盘空间变化
5. **日志记录**: 重要的批量删除操作应该记录到日志中

## 实现细节

### 文件位置
- 源代码: `/workspace/src/tools/file/delete-files.ts`
- 编译后: `/workspace/dist/tools/file/delete-files.js`

### 注册位置
- 工具注册: `/workspace/src/tools/index.ts`
- 已添加到 `registerAllTools()` 函数
- 已导出到 `allTools` 对象

### 依赖关系
- 使用 Node.js `fs/promises` API
- 继承现有的路径验证和安全检查
- 与配置管理系统集成

## 测试建议

1. **单元测试**: 测试各种边界情况（空目录、非空目录、不存在的文件等）
2. **集成测试**: 测试与其他工具的交互
3. **性能测试**: 测试大量文件的删除性能
4. **安全测试**: 测试路径遍历等安全漏洞

## 注意事项

1. **权限问题**: 确保应用程序有足够的权限删除目标文件
2. **符号链接**: 注意处理符号链接的删除行为
3. **并发访问**: 避免在文件被其他进程使用时删除
4. **资源限制**: 大量文件删除可能消耗较多系统资源