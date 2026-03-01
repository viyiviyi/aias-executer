import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '@/types/tools/Tool';

const execAsync = promisify(exec);

export const getToolsDocumentationTool: Tool = {
  definition: {
    name: 'get_tools_documentation',
    description: '获取工作环境，首次使用tool前先调用这个',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: true,      // 只读操作
      destructiveHint: false,  // 非破坏性操作
      idempotentHint: false,   // 非幂等操作（时间信息会变化）
      openWorldHint: false,    // 不是开放世界操作
      category: 'system',      // 系统操作类别
      version: '1.0.0',       // 工具版本
      tags: ['system', 'documentation', 'info', 'help'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: { type: 'string', description: '工具文档内容' },
      },
      required: ['success', 'result']
    },

    // 使用指南
    guidelines: [
      '获取tool运行状态和操作系统基本信息、当前时间、工作空间绝对路径',
    ],

  },

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

      // 获取包管理器信息
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      const packageManager = config.packageManager?.default || 'yarn';

      // 获取包管理器版本
      let packageManagerVersion = '未知';
      try {
        if (packageManager === 'yarn') {
          const { stdout } = await execAsync('yarn --version');
          packageManagerVersion = stdout.trim();
        } else if (packageManager === 'npm') {
          const { stdout } = await execAsync('npm --version');
          packageManagerVersion = stdout.trim();
        }
      } catch (error) {
        console.warn(`无法获取${packageManager}版本:`, error);
      }

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
      // 尝试动态加载docs/tools-help.md文件
      let dynamicContent = '';
      try {
        const toolsHeadPath = path.join(process.cwd(), 'docs/tools-help.md');
        dynamicContent = await fs.readFile(toolsHeadPath, 'utf-8');
        console.log('成功加载动态工具使用建议文档');
      } catch (error: any) {
        console.warn('无法加载动态工具使用建议文档，使用默认内容:', error.message);
        // 使用默认内容
        dynamicContent = ``;
      }

      const toolsDocumentation = `
# 重要信息

## 系统信息
- **操作系统**: ${osInfo.type} ${osInfo.platform} ${osInfo.arch}
- **系统版本**: ${osInfo.release}
- **总内存**: ${osInfo.totalMemory}
- **可用内存**: ${osInfo.freeMemory}

## 环境信息
- **当前时间**: ${currentTime}  UTC: ${now.toISOString()}
- **启动目录**: ${absolutePath} (当前tools服务项目源码路径)
- **服务端口**: ${config.port}
- **工作目录**: ${path.resolve(config.workspaceDir)}
- **Node.js版本**: ${process.version}
- **包管理器**: ${packageManager} ${packageManagerVersion}
- **进程ID**: ${process.pid}  （禁止停止该进程）

${dynamicContent}
`;

      return {
        success: true,
        result: toolsDocumentation
      };
    } catch (error: any) {
      throw new Error(`生成工具文档失败: ${error.message}`);
    }
  }
};