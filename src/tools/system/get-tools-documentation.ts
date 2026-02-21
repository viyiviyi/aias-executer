import { ToolDefinition } from '../../types';
import os from 'os';
import path from 'path';

export const getToolsDocumentationTool = {
  definition: {
    name: 'get_tools_documentation',
    description: '获取工具使用建议文档，包含操作系统基本信息、当前时间、工作空间绝对路径（工作前必看这个）',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  } as ToolDefinition,

  execute: async (): Promise<any> => {
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
- **进程目录**: ${absolutePath}
- **Node.js版本**: ${process.version}
- **进程ID**: ${process.pid}  （该进程是当前执行tool的服务进程，非必要不能停止，如果停止文件、命令行和mcp相关的tool将不可用，停止后需要等待至少10秒等待服务自动重启，如果10秒后未重启，表示出现系统级错误，任何功能都无法使用。）


## 工具使用建议
- 操作文件时优先使用直接操作文件的工具而不是命令行或终端
- 优先更新文件内容而不是重新写入文件
- 终端和命令行工具均有只能查看最新30行输出的限制，不能用于获取较长的内容
- 需要多次交互执行命令行时建议使用终端，如ssh访问服务器、编译、安装服务等操作
- 终端可以输入命令后使用读取终端输出的功能等待和读取需要长时间执行的命令执行结果
- 当使用tool不能达成目的时及时停止而不要无休止的尝试和重试
- 任一操作重试次数不能超过3次，达到重试次数后停止访问任何工具
- 目标不明确时必须询问，切勿当做一般情况自动处理，建议任何工作开始前都询问清楚
- 禁止创建虚假的测试结果；禁止创建虚假的操作结果；当工作无法完成时必须告知实际情况
- 同项目从已有的文件学习编码风格和功能实现风格，而不要按照一般规范处理，符合项目比符合规范更重要
- 没有明确的指示也没有参考项目时规范化、标准化的完成目标工作
- 绝对不能用宽泛或不明确的删除操作
- 尽可能不要执行或生成可能有副作用的代码

## 项目维护指南

1. 在项目目录维护一个dev-readme.md文件，如果没有则新建，文件内容为项目开发维护指南，每次更新项目后更新此文件，此文件只保存项目最新的情况，已过时的资料需要删除。
2. 维护项目时需要先了解原项目功能和架构，以符合原项目架构的方式尽可能少改动的维护项目。


---

**文档生成时间**: ${currentTime}
**文档版本**: 1.0
**最后更新**: ${now.toISOString()}
`;

      return {
        success: true,
        result: toolsDocumentation
      };
    } catch (error: any) {
      throw new Error(`生成工具文档失败: ${error.message}`);
    }
  }
}