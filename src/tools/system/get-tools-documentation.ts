import { ToolDefinition } from '../../types';
import os from 'os';
import path from 'path';

export const getToolsDocumentationTool = {
  definition: {
    name: 'get_tools_documentation',
    description: '获取工具使用建议文档，包括各个工具的适应情况和限制，并包含操作系统基本信息、当前时间、工作空间绝对路径',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  } as ToolDefinition,

  execute: async (): Promise<string> => {
    try {
      // 获取系统信息
      const osInfo = {
        platform: os.platform(),
        arch: os.arch(),
        type: os.type(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
        freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
        uptime: `${Math.round(os.uptime() / 3600)} 小时`
      };

      // 获取当前时间
      const now = new Date();
      const currentTime = now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // 获取工作空间路径
      const workspacePath = process.cwd();
      const absolutePath = path.resolve(workspacePath);

      // 工具使用建议文档
      const toolsDocumentation = `
# 工具使用建议文档

## 系统信息
- **操作系统**: ${osInfo.type} ${osInfo.platform} ${osInfo.arch}
- **系统版本**: ${osInfo.release}
- **主机名**: ${osInfo.hostname}
- **CPU核心数**: ${osInfo.cpus}
- **总内存**: ${osInfo.totalMemory}
- **可用内存**: ${osInfo.freeMemory}
- **系统运行时间**: ${osInfo.uptime}

## 环境信息
- **当前时间**: ${currentTime}
- **工作空间路径**: ${absolutePath}
- **Node.js版本**: ${process.version}
- **进程ID**: ${process.pid}

## 文件操作工具

### 1. read_file - 读取文件
**适应情况**:
- 读取文本文件内容（支持多种编码格式）
- 查看配置文件、日志文件、代码文件等
- 支持按行范围读取大文件的部分内容

**限制**:
- 不支持二进制文件读取
- 默认支持的文件扩展名有限制（可配置）

**最佳实践**:
**最佳实践**:
- 使用 append 模式追加日志内容
- 对于大文件，考虑分块写入

### 3. read_code - 读取代码文件
**适应情况**:
- 读取代码文件内容，支持行号显示
- 查看和分析源代码文件
- 支持按行范围读取部分代码
- 返回带行号的内容

**限制**:
- 不支持二进制文件读取
- 默认支持的文件扩展名有限制（可配置）
- 文件大小有限制

**最佳实践**:
- 使用 show_line_numbers 参数控制是否显示行号
- 使用 line_number_format 自定义行号格式（默认：{line}│）
- 对于大文件，使用 start_line 和 end_line 参数分块读取
- 指定合适的文件编码（默认utf-8）
**限制**:
- 一次性写入整个内容，不适合超大文件
- 需要确保目录存在
- 文件权限可能受限

**最佳实践**:
- 使用 append 模式追加日志内容
- 对于大文件，考虑分块写入

### 3. read_code - 读取代码文件
**适应情况**:
- 读取代码文件内容，支持行号显示
- 查看和分析源代码文件
- 支持按行范围读取部分代码
- 返回带行号的内容和结构化数据

**限制**:
- 不支持二进制文件读取
- 默认支持的文件扩展名有限制（可配置）
- 文件大小有限制

**最佳实践**:
- 使用 show_line_numbers 参数控制是否显示行号
- 使用 line_number_format 自定义行号格式
- 对于大文件，使用 start_line 和 end_line 参数分块读取
- 指定合适的文件编码（默认utf-8）

### 4. list_directory - 列出目录
**适应情况**:
- 浏览文件系统结构
- 查找特定文件或目录
- 递归获取目录树

**限制**:
- 可能跳过隐藏文件和特定目录（可配置）
- 递归深度可能受性能限制
- 符号链接处理可能有限

**最佳实践**:
- 使用 recursive=true 获取完整目录结构
- 配置 skip_dirs 跳过不需要的目录（如node_modules）
- 使用 skip_hidden 控制是否显示隐藏文件
- 未知项目绝对不递归获取子目录

### 5. update_file - 更新文件
**适应情况**:
- 在文件中插入、删除或修改内容
- 批量文件编辑操作
- 代码文件的部分更新

**限制**:
- 需要精确的行号定位
- 批量操作时行号需要动态调整
- 不支持正则表达式替换

**最佳实践**:
- 先读取文件了解结构再进行更新
- 批量操作时注意行号的变化
- 测试更新操作后再应用到重要文件

## 系统操作工具

### 6. execute_command - 执行命令
**适应情况**:
- 执行系统命令和脚本
- 运行编译、构建、测试等任务
- 快速执行简单命令

**限制**:
- 不适合交互式命令
- 超时时间有限（默认30秒）
- 环境变量可能受限

**最佳实践**:
- 对于长时间运行的任务，使用终端工具
- 设置合适的超时时间
- 指定工作目录和环境变量

### 7. 终端工具组（create_terminal, terminal_input, read_terminal_output, close_terminal, list_terminals）
**适应情况**:
- 交互式命令行会话
- 长时间运行的任务
- 需要用户输入的命令
- 需要持续监控输出的任务

**限制**:
- 需要管理终端会话生命周期
- 输出可能包含控制字符
- 并发终端数量可能有限

**最佳实践**:
- 使用 create_terminal 创建交互式会话
- 使用 terminal_input 向终端发送命令并等待输出
- 使用 read_terminal_output 主动读取终端输出
- 及时使用 close_terminal 关闭不再需要的终端
- 使用 list_terminals 管理多个会话

**终端输出处理逻辑**:
1. 最多等待30秒或超过3秒无新输出时返回
2. 返回的输出最多包含最近30行
3. 读取时如果无新输出，返回最后5行并告知无新输出
4. 不区分标准输出和错误输出，合并处理

## 网络操作工具

### 8. http_request - HTTP请求
**适应情况**:
- 调用REST API接口
- 获取网页内容
- 发送数据到远程服务

**限制**:
- 不支持二进制流响应
- 超时时间有限（默认30秒）
- 可能需要处理SSL证书

**最佳实践**:
- 设置合适的超时时间
- 使用合适的HTTP方法和头部
- 处理可能的网络错误

## MCP工具

### 9. MCP工具组（mcp_discover_servers, mcp_scan_server等）
**适应情况**:
- 管理和调用MCP（Model Context Protocol）服务器
- 扩展工具能力
- 集成外部服务

**限制**:
- 需要MCP服务器支持
- 网络连接可能受限
- 服务器管理需要权限

**最佳实践**:
- 使用 mcp_discover_servers 发现可用服务器
- 使用 mcp_list_tools 查看可用工具
- 合理管理服务器生命周期

## 通用建议

### 安全性考虑
1. **文件操作**: 避免操作敏感系统文件
2. **命令执行**: 谨慎执行未知命令
3. **网络请求**: 验证目标URL的安全性
4. **权限管理**: 使用最小必要权限

### 性能优化
1. **大文件处理**: 使用分块读取/写入
2. **目录遍历**: 限制递归深度
3. **网络请求**: 设置合理超时
4. **资源清理**: 及时关闭终端和连接

### 错误处理
1. **文件不存在**: 检查文件路径
2. **权限不足**: 验证操作权限
3. **网络超时**: 设置重试机制
4. **格式错误**: 验证输入参数

### 防止无限循环
1. 当工具连续出错后停止工作等待用户维护，防止循环发起无用的请求。


## 项目维护指南

1. 在项目目录维护一个dev-readme.md文件，如果没有则新建，文件内容为项目开发维护指南，每次更新项目后更新此文件，此文件只保存项目最新的情况，已过时的资料需要删除。
2. 维护项目时需要先了解原项目功能和架构，以符合原项目架构的方式尽可能少改动的维护项目。


---

**文档生成时间**: ${currentTime}
**文档版本**: 1.0
**最后更新**: ${now.toISOString()}
`;

      return toolsDocumentation;
    } catch (error: any) {
      throw new Error(`生成工具文档失败: ${error.message}`);
    }
  }
};