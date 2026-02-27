import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';

const configManager = ConfigManager.getInstance();

export const moveFileTool: Tool = {
  definition: {
    name: 'move_file',
    description: '移动文件或目录到新位置',
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
      readOnlyHint: false,      // 非只读操作（移动文件）
      destructiveHint: true,    // 破坏性操作（移动文件）
      idempotentHint: false,    // 非幂等操作（多次移动可能产生不同结果）
      openWorldHint: false,     // 不是开放世界操作
      category: 'file',         // 文件操作类别
      version: '1.0.0',        // 工具版本
      tags: ['file', 'move', 'rename', 'relocate'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: { type: 'string', description: '操作结果消息' },
        source: { type: 'string', description: '源路径' },
        destination: { type: 'string', description: '目标路径' },
        overwrite: { type: 'boolean', description: '是否覆盖' },
        create_parents: { type: 'boolean', description: '是否创建父目录' },
        operation_type: { type: 'string', enum: ['file', 'directory'], description: '操作类型' }
      },
      required: ['success', 'result', 'source', 'destination', 'operation_type']
    },

    // 示例用法
    examples: [
      {
        description: '移动文件',
        parameters: {
          source: 'old-location.txt',
          destination: 'new-location.txt'
        },
        expectedOutput: {
          success: true,
          result: '文件/目录从 old-location.txt 移动到 new-location.txt 成功',
          source: 'old-location.txt',
          destination: 'new-location.txt',
          overwrite: false,
          create_parents: true,
          operation_type: 'file'
        }
      },
      {
        description: '移动目录',
        parameters: {
          source: 'old-folder',
          destination: 'new-folder'
        },
        expectedOutput: {
          success: true,
          result: '文件/目录从 old-folder 移动到 new-folder 成功',
          source: 'old-folder',
          destination: 'new-folder',
          overwrite: false,
          create_parents: true,
          operation_type: 'directory'
        }
      },
      {
        description: '覆盖已存在的文件',
        parameters: {
          source: 'new-file.txt',
          destination: 'existing.txt',
          overwrite: true
        },
        expectedOutput: {
          success: true,
          result: '文件/目录从 new-file.txt 移动到 existing.txt 成功',
          source: 'new-file.txt',
          destination: 'existing.txt',
          overwrite: true,
          create_parents: true,
          operation_type: 'file'
        }
      }
    ],

    // 使用指南
    guidelines: [
      '支持移动文件和目录',
      '默认不覆盖已存在的目标文件',
      '自动创建目标目录的父目录',
      '使用文件系统rename操作，效率高',
      '返回详细的操作信息'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const sourcePath = parameters.source;
    const destinationPath = parameters.destination;
    const overwrite = parameters.overwrite || false;
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
      const destDir = path.dirname(resolvedDestination);
      await fs.mkdir(destDir, { recursive: true });
    }

    // 执行移动操作
    await fs.rename(resolvedSource, resolvedDestination);

    return {
      success: true,
      result: `文件/目录从 ${sourcePath} 移动到 ${destinationPath} 成功`,
    };
  }
};
