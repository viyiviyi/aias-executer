# 项目开发维护指南

## 项目概述
这是一个可以维护当前tools的项目，以自举的形式维护自身。项目提供了多种工具，包括文件操作、系统命令执行、网络请求等。

## 最新更新（2026-02-17）

### read_code 工具优化
已对 `read_code` 工具进行优化，移除了 `lines_with_numbers` 数组，简化了返回结构，并将默认行号格式改为使用制表符 `│`。

#### 主要改进：
1. **简化返回结构**：移除了 `lines_with_numbers` 数组，避免干扰上下文
2. **改进行号格式**：默认使用制表符 `│` 代替冒号 `:`，更清晰易读
3. **保持核心功能**：保留行号显示、行范围选择、自定义格式等功能

#### 当前返回结构：
```typescript
{
  content: string,           // 格式化后的内容（带行号）
  total_lines: number,       // 文件总行数
  start_line: number,        // 实际读取的起始行
  end_line: number          // 实际读取的结束行
}
```

#### 默认行号格式：
- 旧格式：`{line}: `（例如：`1: `, `2: `）
- 新格式：`{line}│`（例如：`1│`, `2│`）

#### 使用示例：
```javascript
// 使用默认格式（制表符│）
read_code({
  path: 'example.py'
});

// 使用自定义格式
read_code({
  path: 'example.py',
  line_number_format: '[{line}] '
});

// 不显示行号
read_code({
  path: 'example.py',
  show_line_numbers: false
});

// 读取部分行
read_code({
  path: 'example.py',
  start_line: 5,
  end_line: 15
});
```

## 项目结构
```
src/
├── api/                    # API接口
├── core/                  # 核心模块
│   ├── config.ts         # 配置管理
│   ├── executor.ts       # 工具执行器
│   ├── mcp-client.ts     # MCP客户端
│   └── tool-registry.ts  # 工具注册表
├── tools/                # 工具实现
│   ├── file/            # 文件操作工具
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── list-directory.ts
│   │   ├── update-file.ts
│   │   └── read-code.ts  # 优化后的read_code工具
│   ├── system/          # 系统工具
│   ├── network/         # 网络工具
│   └── mcp/             # MCP工具
├── types/               # 类型定义
└── index.ts            # 项目入口
```

## 可用工具列表
1. **文件操作工具**：
   - `read_file` - 读取文件内容
   - `write_file` - 写入文件
   - `list_directory` - 列出目录
   - `update_file` - 更新文件内容
   - `read_code` - 读取代码文件（带行号，使用制表符│格式）

2. **系统工具**：
   - `execute_command` - 执行命令
   - `create_terminal` - 创建终端
   - `terminal_input` - 终端输入
   - `close_terminal` - 关闭终端
   - `list_terminals` - 列出终端
   - `get_tools_documentation` - 获取工具文档

3. **网络工具**：
   - `http_request` - HTTP请求

4. **MCP工具**：
   - `mcp_discover_servers` - 发现MCP服务器
   - `mcp_scan_server` - 扫描MCP服务器
   - `mcp_add_server` - 添加MCP服务器
   - `mcp_call_tool` - 调用MCP工具
   - `mcp_list_tools` - 列出MCP工具
   - `mcp_list_servers` - 列出MCP服务器
   - `mcp_start_server` - 启动MCP服务器
   - `mcp_stop_server` - 停止MCP服务器
   - `mcp_remove_server` - 移除MCP服务器

## 开发指南
1. **添加新工具**：
   - 在 `src/tools/` 相应目录下创建工具文件
   - 实现工具定义和执行函数
   - 在 `src/tools/index.ts` 中注册工具
   - 更新 `get_tools_documentation` 工具文档

2. **代码规范**：
   - 使用TypeScript编写
   - 遵循现有代码结构
   - 包含完整的类型定义
   - 添加适当的错误处理

3. **测试**：
   - 创建测试文件验证功能
   - 测试边界条件和错误情况
   - 确保与现有工具兼容

## 构建和运行
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行项目
npm start
```

## 注意事项
1. 工具执行有安全限制，避免操作敏感系统文件
2. 文件操作有大小限制，大文件需要分块处理
3. 命令执行有超时限制，长时间任务建议使用终端工具
4. 网络请求需要验证目标URL的安全性

## 维护记录
- 2026-02-17：优化 `read_code` 工具，移除 `lines_with_numbers` 数组，默认使用制表符 `│` 格式
- 2026-02-17：添加 `read_code` 工具，支持带行号的代码文件读取
- 2026-02-16：项目初始版本，包含基础文件操作、系统命令、网络请求等工具

---
*最后更新：2026-02-17*