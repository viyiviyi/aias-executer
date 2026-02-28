import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const copyFileTool: Tool = {
  definition: {
    name: 'copy_file',
    description: '复制文件或目录到新位置',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: '源文件或目录路径（相对于工作目录）'
        },
        destination: {
          type: 'string',
          description: '目标路径（相对于工作目录）'
        },
        overwrite: {
          type: 'boolean',
          description: '是否覆盖已存在的目标文件（可选，默认false）',
          default: false
        },
        recursive: {
          type: 'boolean',
          description: '是否递归复制目录内容（可选，默认true）',
          default: true
        },
        create_parents: {
          type: 'boolean',
          description: '是否自动创建目标目录的父目录（可选，默认true）',
          default: true
        }
      },
      required: ['source', 'destination']
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（复制文件）
      destructiveHint: false,   // 非破坏性操作（不修改源文件）
      idempotentHint: true,     // 幂等操作（相同输入产生相同输出）
      openWorldHint: false,     // 不是开放世界操作
      category: 'file',         // 文件操作类别
      version: '1.0.0',        // 工具版本
      tags: ['file', 'copy', 'duplicate', 'backup'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: { type: 'string', description: '操作结果消息' },
      },
      required: ['success', 'result']
    },

    // 使用指南
    guidelines: [
      '支持复制文件和目录',
      '默认递归复制目录内容',
      '默认不覆盖已存在的目标文件',
      '自动创建目标目录的父目录',
      '返回详细的操作信息'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const sourcePath = parameters.source;
    const destinationPath = parameters.destination;
    const overwrite = parameters.overwrite || false;
    const recursive = parameters.recursive !== false; // 默认true
    const createParents = parameters.create_parents !== false; // 默认true

    // 验证源路径
    const resolvedSource = configManager.validatePath(sourcePath, true);

    // 验证目标路径
    const resolvedDestination = configManager.validatePath(destinationPath);

    // 检查源文件/目录是否存在
    try {
      await fs.access(resolvedSource);
    } catch (error) {
      throw new Error(`源路径不存在: ${sourcePath}`);
    }

    // 获取源文件/目录信息
    const stats = await fs.stat(resolvedSource);

    // 检查目标是否已存在
    let targetExists = false;
    try {
      await fs.access(resolvedDestination);
      targetExists = true;
    } catch (error) {
      // 目标不存在，可以继续
    }

    if (targetExists && !overwrite) {
      throw new Error(`目标路径已存在: ${destinationPath}。使用 overwrite=true 来覆盖`);
    }

    // 如果需要，创建目标目录的父目录
    if (createParents) {
      const destDir = stats.isDirectory() ? resolvedDestination : path.dirname(resolvedDestination);
      await fs.mkdir(destDir, { recursive: true });
    }

    if (stats.isDirectory()) {
      // 复制目录
      if (!recursive) {
        throw new Error(`源路径是目录: ${sourcePath}。使用 recursive=true 来复制目录`);
      }

      // 使用cp命令递归复制目录
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync(`cp -r "${resolvedSource}" "${resolvedDestination}"`);
      return {
        success: true,
        result: `目录从 ${sourcePath} 复制到 ${destinationPath} 成功`,
      };
    } else {
      // 复制文件
      await fs.copyFile(resolvedSource, resolvedDestination);
      return {
        success: true,
        result: `文件从 ${sourcePath} 复制到 ${destinationPath} 成功`,
      };
    }
  }
};