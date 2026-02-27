import fs from 'fs/promises';
import { ToolDefinition } from '../../types';
import { ConfigManager } from '../../core/config';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const getToolsDocumentationTool = {
  definition: {
    name: 'get_tools_documentation',
    description: '获取工具使用建议文档，包含操作系统基本信息、当前时间、工作空间绝对路径（工作前必看这个）',
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
        system_info: {
          type: 'object',
          properties: {
            platform: { type: 'string', description: '操作系统平台' },
            arch: { type: 'string', description: '系统架构' },
            type: { type: 'string', description: '系统类型' },
            release: { type: 'string', description: '系统版本' },
            hostname: { type: 'string', description: '主机名' },
            cpus: { type: 'integer', description: 'CPU核心数' },
            totalMemory: { type: 'string', description: '总内存' },
            freeMemory: { type: 'string', description: '可用内存' },
            uptime: { type: 'string', description: '运行时间' }
          },
          required: ['platform', 'arch', 'type', 'release', 'cpus', 'totalMemory', 'freeMemory']
        },
        environment_info: {
          type: 'object',
          properties: {
            current_time: { type: 'string', description: '当前时间' },
            utc_time: { type: 'string', description: 'UTC时间' },
            launch_directory: { type: 'string', description: '启动目录' },
            service_port: { type: 'integer', description: '服务端口' },
            workspace_dir: { type: 'string', description: '工作目录' },
            node_version: { type: 'string', description: 'Node.js版本' },
            package_manager: { type: 'string', description: '包管理器' },
            package_manager_version: { type: 'string', description: '包管理器版本' },
            process_id: { type: 'integer', description: '进程ID' }
          },
          required: ['current_time', 'utc_time', 'launch_directory', 'service_port', 'workspace_dir', 'node_version', 'process_id']
        }
      },
      required: ['success', 'result']
    },

    // 示例用法
    examples: [
      {
        description: '获取工具文档',
        parameters: {},
        expectedOutput: {
          success: true,
          result: '# 重要信息\n\n## 系统信息\n- **操作系统**: Windows_NT win32 x64\n- **系统版本**: 10.0.19045\n- **总内存**: 16 GB\n- **可用内存**: 8 GB\n\n## 环境信息\n- **当前时间**: 2024/01/01 12:00:00 UTC: 2024-01-01T12:00:00.000Z\n- **启动目录**: /path/to/project\n- **服务端口**: 3000\n- **工作目录**: /path/to/workspace\n- **Node.js版本**: v18.17.0\n- **包管理器**: yarn 1.22.19\n- **进程ID**: 1234',
          system_info: {
            platform: 'win32',
            arch: 'x64',
            type: 'Windows_NT',
            release: '10.0.19045',
            hostname: 'DESKTOP-ABC123',
            cpus: 8,
            totalMemory: '16 GB',
            freeMemory: '8 GB',
            uptime: '24 小时'
          },
          environment_info: {
            current_time: '2024/01/01 12:00:00',
            utc_time: '2024-01-01T12:00:00.000Z',
            launch_directory: '/path/to/project',
            service_port: 3000,
            workspace_dir: '/path/to/workspace',
            node_version: 'v18.17.0',
            package_manager: 'yarn',
            package_manager_version: '1.22.19',
            process_id: 1234
          }
        }
      }
    ],

    // 使用指南
    guidelines: [
      '工作前必看此文档，了解系统环境和工具使用建议',
      '包含操作系统基本信息、当前时间、工作空间路径',
      '提供工具使用原则和最佳实践',
      '动态加载文档内容，支持自定义',
      '返回结构化系统信息和环境信息'
    ],

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