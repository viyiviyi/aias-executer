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

    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（创建操作）
      destructiveHint: false,   // 非破坏性操作（创建目录不会破坏现有数据）
      idempotentHint: true,     // 幂等操作（已存在目录不会报错）
      openWorldHint: false,     // 不是开放世界操作
      category: 'file',         // 文件操作类别
      version: '1.0.0',        // 工具版本
      tags: ['file', 'directory', 'create', 'mkdir'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        message: { type: 'string', description: '操作结果消息' },
        created: {
          type: 'array',
          description: '成功创建的目录信息',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: '目录路径' },
              absolutePath: { type: 'string', description: '绝对路径' },
              existed: { type: 'boolean', description: '目录是否已存在' }
            },
            required: ['path', 'absolutePath', 'existed']
          }
        },
        failed: {
          type: 'array',
          description: '创建失败的目录信息',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: '目录路径' },
              error: { type: 'string', description: '错误信息' }
            },
            required: ['path', 'error']
          }
        },
        total_requested: { type: 'integer', description: '请求创建的目录总数' },
        total_created: { type: 'integer', description: '成功创建的目录数' },
        total_existed: { type: 'integer', description: '已存在的目录数' },
        total_failed: { type: 'integer', description: '创建失败的目录数' }
      },
      required: ['success', 'message', 'created', 'failed', 'total_requested', 'total_created', 'total_existed', 'total_failed']
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

    // 示例用法
    examples: [
      {
        description: '创建单个目录',
        parameters: { path: 'new-folder' },
        expectedOutput: {
          success: true,
          message: '成功创建1个目录',
          created: [
            { path: 'new-folder', absolutePath: '/workspace/new-folder', existed: false }
          ],
          failed: [],
          total_requested: 1,
          total_created: 1,
          total_existed: 0,
          total_failed: 0
        }
      },
      {
        description: '批量创建多个目录',
        parameters: {
          paths: ['dir1', 'dir2/subdir', 'dir3/subdir/subsubdir']
        },
        expectedOutput: {
          success: true,
          message: '成功创建3个目录',
          created: [
            { path: 'dir1', absolutePath: '/workspace/dir1', existed: false },
            { path: 'dir2/subdir', absolutePath: '/workspace/dir2/subdir', existed: false },
            { path: 'dir3/subdir/subsubdir', absolutePath: '/workspace/dir3/subdir/subsubdir', existed: false }
          ],
          failed: [],
          total_requested: 3,
          total_created: 3,
          total_existed: 0,
          total_failed: 0
        }
      },
      {
        description: '创建已存在的目录',
        parameters: { path: 'existing-folder' },
        expectedOutput: {
          success: true,
          message: '成功创建0个目录，1个目录已存在',
          created: [
            { path: 'existing-folder', absolutePath: '/workspace/existing-folder', existed: true }
          ],
          failed: [],
          total_requested: 1,
          total_created: 0,
          total_existed: 1,
          total_failed: 0
        }
      }
    ]
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