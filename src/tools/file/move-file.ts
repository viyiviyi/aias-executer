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
    }
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
