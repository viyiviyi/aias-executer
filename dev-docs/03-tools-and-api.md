# 工具列表和API接口

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