# 终端功能升级说明

## 概述

AIAS Executor 的终端功能已从传统的 `child_process.spawn()` 升级为使用 `node-pty` 库，以支持完整的伪终端功能。

## 新功能

### 1. 交互式程序支持
- 现在可以正常运行交互式程序如 `vim`、`nano`、`top`、`htop` 等
- 支持命令行提示符和用户输入

### 2. 终端控制序列
- 支持 ANSI 转义序列（颜色、光标移动、清屏等）
- 支持终端类型配置（如 xterm-256color）

### 3. 信号处理
- 支持发送信号到终端进程：
  - `SIGINT` (Ctrl+C) - 中断进程
  - `SIGTSTP` (Ctrl+Z) - 暂停进程
  - `SIGQUIT` (Ctrl+\) - 退出进程
  - `SIGKILL` (Esc) - 终止进程

### 4. 终端尺寸调整
- 支持动态调整终端尺寸（列数和行数）
- 适用于需要特定终端尺寸的程序

### 5. 原始输出访问
- 可以获取包含控制字符的原始终端输出
- 适用于需要处理 ANSI 序列的高级用例

## 配置选项

在 `config.yaml` 中添加了新的终端配置：

```yaml
terminal:
  # 是否使用 node-pty（伪终端）
  usePty: true
  # 默认终端尺寸
  defaultCols: 80
  defaultRows: 24
  # 终端编码（Windows 上不支持）
  encoding: "utf8"
  # 终端类型
  terminalType: "xterm-256color"
  # 输出缓冲区最大行数
  maxBufferSize: 1000
```

环境变量支持：
- `TERMINAL_USE_PTY`: 是否使用 pty（默认: true）
- `TERMINAL_DEFAULT_COLS`: 默认列数（默认: 80）
- `TERMINAL_DEFAULT_ROWS`: 默认行数（默认: 24）
- `TERMINAL_ENCODING`: 终端编码（默认: utf8）
- `TERMINAL_TYPE`: 终端类型（默认: xterm-256color）
- `TERMINAL_MAX_BUFFER_SIZE`: 缓冲区大小（默认: 1000）

## 新增工具

### 1. `terminal_resize` - 调整终端尺寸
```typescript
参数:
- terminal_id: string (必需) - 终端ID
- cols: number (必需) - 列数 (20-500)
- rows: number (必需) - 行数 (10-100)
```

### 2. `terminal_send_signal` - 发送信号
```typescript
参数:
- terminal_id: string (必需) - 终端ID
- signal: string (必需) - 信号类型 (SIGINT, SIGTSTP, SIGQUIT, SIGKILL)
```

### 3. `terminal_get_raw_output` - 获取原始输出
```typescript
参数:
- terminal_id: string (必需) - 终端ID
```

## API 兼容性

### 保持不变的 API
1. 所有现有终端工具的接口保持不变：
   - `terminal_create` - 创建终端
   - `terminal_input` - 向终端输入命令
   - `terminal_read_output` - 读取终端输出
   - `terminal_close` - 关闭终端
   - `terminals_list` - 列出所有终端

2. 所有工具的返回值格式保持不变

3. 错误处理机制保持不变

### 扩展的 API
1. `createTerminal` 方法新增可选参数：
   - `cols`: number - 终端列数
   - `rows`: number - 终端行数
   - `encoding`: string - 终端编码

2. `listTerminals` 方法返回新增字段：
   - `cols`: number - 终端列数
   - `rows`: number - 终端行数
   - `encoding`: string - 终端编码
   - `use_pty`: boolean - 是否使用 pty

## 向后兼容性

### 降级机制
如果 `node-pty` 初始化失败或配置中设置 `usePty: false`，系统会自动回退到传统的 `child_process.spawn()` 方式。

### 配置默认值
默认启用 `node-pty` (`usePty: true`)，但可以通过配置或环境变量禁用。

## 平台支持

### Windows
- 使用 `conpty` (Windows 10+) 或 `winpty` (旧版本)
- 不支持 `encoding` 参数
- 建议使用 `cmd.exe` 或 `powershell` 作为 shell

### Linux/macOS
- 使用系统原生伪终端
- 支持完整的终端功能
- 建议使用 `bash`、`zsh` 等作为 shell

## 性能考虑

### 内存使用
- `node-pty` 比传统子进程有额外的内存开销
- 输出缓冲区限制为 `maxBufferSize` 行（默认 1000）

### 响应时间
- 伪终端提供更快的响应时间
- 支持实时输出流

## 测试验证

已通过以下测试：
1. ✅ 终端创建和基本功能
2. ✅ 交互式命令执行
3. ✅ 终端尺寸调整
4. ✅ 信号发送
5. ✅ 原始输出获取
6. ✅ 跨平台兼容性（Windows/Linux/macOS）
7. ✅ API 向后兼容性

## 已知限制

1. **Windows 编码限制**: Windows 上不支持设置终端编码
2. **Shell 检查**: 某些 shell 可能无法通过 `where`/`which` 命令找到
3. **进程状态检查**: `node-pty` 没有公开的进程退出状态属性

## 故障排除

### 常见问题

1. **终端创建失败**
   - 检查 shell 是否存在且可执行
   - 检查工作目录权限
   - 查看日志中的错误信息

2. **终端无响应**
   - 检查进程是否已退出
   - 尝试发送 `SIGINT` 信号
   - 检查终端尺寸是否合适

3. **控制字符显示问题**
   - 使用 `terminal_get_raw_output` 获取原始输出
   - 检查终端类型配置

### 日志信息
终端管理器会输出以下日志：
- Shell 检查警告
- 终端创建成功/失败信息
- 进程退出通知

## 后续改进计划

1. 终端会话持久化
2. 输出流式传输支持
3. 更多终端类型配置
4. 终端主题支持
5. 多标签终端支持

## 参考资料

1. [node-pty 文档](https://github.com/microsoft/node-pty)
2. [ANSI 转义序列](https://en.wikipedia.org/wiki/ANSI_escape_code)
3. [伪终端概念](https://en.wikipedia.org/wiki/Pseudoterminal)