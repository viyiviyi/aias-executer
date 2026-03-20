import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';
import { validateParameters } from '../../core/utils/error-utils';

const configManager = ConfigManager.getInstance();

export const createDirectoryTool: Tool = {
  definition: {
    name: 'utils_create_directory',
    groupName: '基础工具',
    description: '创建目录，支持批量创建和多层目录创建',
    parameters: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: '目录路径数组（相对于工作目录），支持批量创建多个目录',
          default: []
        },
        path: {
          type: 'string',
          description: '单个目录路径（相对于工作目录），如果提供paths则优先使用paths'
        },
        recursive: {
          type: 'boolean',
          description: '是否递归创建父目录（多层目录）',
          default: true
        },
        mode: {
          type: 'number',
          description: '目录权限（八进制，如0755），可选',
          default: 0o755
        }
      },
      required: [] // paths或path至少需要一个
    },

    // 使用指南
    guidelines: [
      '支持批量创建多个目录，使用paths参数传入数组',
      '支持单个目录创建，使用path参数',
      '自动创建多层目录（recursive默认为true）',
      '如果目录已存在，不会报错，只是标记为已存在',
      '可以设置目录权限（mode参数）',
      '所有目录路径必须在工作空间内'
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    // 参数验证
    validateParameters(parameters, [], {
      paths: (value) => Array.isArray(value) && value.every((item: any) => typeof item === 'string'),
      path: (value) => typeof value === 'string',
      recursive: (value) => typeof value === 'boolean',
      mode: (value) => typeof value === 'number' && value >= 0 && value <= 0o777
    });

    // 获取目录路径列表
    let dirPaths: string[] = [];

    if (parameters.paths && Array.isArray(parameters.paths) && parameters.paths.length > 0) {
      // 使用paths参数（批量创建）
      dirPaths = parameters.paths;
    } else if (parameters.path) {
      // 使用path参数（单个创建）
      dirPaths = [parameters.path];
    } else {
      throw new Error('必须提供path参数或paths参数');
    }

    const recursive = parameters.recursive !== false; // 默认为true
    const mode = parameters.mode || 0o755;

    const results = {
      created: [] as Array<{path: string, absolutePath: string, existed: boolean}>,
      failed: [] as Array<{path: string, error: string}>
    };

    // 统计信息
    let totalCreated = 0;
    let totalExisted = 0;
    let totalFailed = 0;

    // 遍历所有目录路径
    for (const dirPath of dirPaths) {
      try {
        // 验证路径
        const resolvedPath = configManager.validatePath(dirPath, false);

        // 检查目录是否已存在
        let existed = false;
        try {
          await fs.access(resolvedPath);
          existed = true;
          totalExisted++;
        } catch {
          // 目录不存在，需要创建
          existed = false;
        }

        // 创建目录（如果不存在）
        if (!existed) {
          await fs.mkdir(resolvedPath, { recursive, mode });
          totalCreated++;
        }

        // 记录成功结果
        results.created.push({
          path: dirPath,
          absolutePath: resolvedPath,
          existed
        });
      } catch (error: any) {
        totalFailed++;
        results.failed.push({
          path: dirPath,
          error: error.message || String(error)
        });
      }
    }

    // 构建响应消息
    const totalRequested = dirPaths.length;
    let message = '';

    if (totalFailed === 0) {
      if (totalCreated > 0 && totalExisted > 0) {
        message = `成功创建${totalCreated}个目录，${totalExisted}个目录已存在`;
      } else if (totalCreated > 0) {
        message = `成功创建${totalCreated}个目录`;
      } else if (totalExisted > 0) {
        message = `所有${totalExisted}个目录已存在`;
      } else {
        message = '没有创建任何目录';
      }
    } else {
      message = `成功创建${totalCreated}个目录，${totalExisted}个目录已存在，${totalFailed}个目录创建失败`;
    }

    return {
      success: totalFailed === 0,
      message,
      created: results.created,
      failed: results.failed,
      total_requested: totalRequested,
      total_created: totalCreated,
      total_existed: totalExisted,
      total_failed: totalFailed
    };
  }
};