import fs from 'fs/promises';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/Tool';

const configManager = ConfigManager.getInstance();

interface DeleteItem {
  path: string;
  recursive?: boolean;
  force?: boolean;
}

export const deleteFilesTool: Tool = {
  definition: {
    name: 'delete_files',
    description: '批量删除文件或目录，支持递归删除和强制删除',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: '要删除的文件或目录路径（相对于工作目录）'
              },
              recursive: {
                type: 'boolean',
                description: '是否递归删除目录及其内容（可选，默认false）',
                default: false
              },
              force: {
                type: 'boolean',
                description: '是否强制删除（忽略不存在的文件错误，可选，默认false）',
                default: false
              }
            },
            required: ['path']
          },
          description: '要删除的文件或目录列表'
        },
        continue_on_error: {
          type: 'boolean',
          description: '当某个项目删除失败时是否继续处理其他项目（可选，默认false）',
          default: false
        },
      },
      required: ['items']
    },
    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（删除文件）
      destructiveHint: true,    // 破坏性操作（删除文件）
      idempotentHint: false,    // 非幂等操作（多次删除可能产生不同结果）
      openWorldHint: false,     // 不是开放世界操作
      category: 'file',         // 文件操作类别
      version: '1.0.0',        // 工具版本
      tags: ['file', 'delete', 'remove', 'cleanup'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '整体操作是否成功' },
        results: {
          type: 'string',
          description: '简单删除结果',
        },
        continue_on_error: { type: 'boolean', description: '是否在错误时继续' }
      },
      required: ['success', 'results']
    },

    // 使用指南
    guidelines: [
      '支持批量删除文件和目录',
      '可以配置递归删除目录',
      '可以强制删除忽略不存在的文件错误',
      '可以配置在错误时继续处理其他项目',
      '返回每个项目的详细删除结果'
    ],

  },

  async execute(parameters: Record<string, any>): Promise<any> {
    const items = parameters.items as DeleteItem[];
    const continueOnError = parameters.continue_on_error || false;

    if (!items || items.length === 0) {
      throw new Error('items参数不能为空');
    }

    // 验证所有项目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.path || typeof item.path !== 'string') {
        throw new Error(`第 ${i + 1} 个项目：path参数必须是非空字符串`);
      }
      if (item.recursive !== undefined && typeof item.recursive !== 'boolean') {
        throw new Error(`第 ${i + 1} 个项目：recursive参数必须是布尔值`);
      }
      if (item.force !== undefined && typeof item.force !== 'boolean') {
        throw new Error(`第 ${i + 1} 个项目：force参数必须是布尔值`);
      }
    }

    const results: Array<{
      index: number;
      path: string;
      success: boolean;
      message: string;
      error?: string;
    }> = [];

    // 逐个处理删除项目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const filePath = item.path;
      const recursive = item.recursive || false;
      const force = item.force || false;

      try {
        // 验证路径
        const resolvedPath = configManager.validatePath(filePath, !force); // 如果force为true，不要求路径必须存在

        try {
          // 检查路径是否存在
          try {
            await fs.access(resolvedPath);
          } catch (error) {
            if (force) {
              results.push({
                index: i,
                path: filePath,
                success: true,
                message: `路径不存在，由于 force=true，操作成功完成`
              });
              continue;
            }
            throw new Error(`路径不存在: ${filePath}`);
          }

          // 获取文件/目录状态
          const stats = await fs.stat(resolvedPath);

          if (stats.isDirectory()) {
            // 如果是目录，检查是否为空
            if (!recursive) {
              const files = await fs.readdir(resolvedPath);
              if (files.length > 0) {
                throw new Error(`目录不为空。使用 recursive=true 来删除非空目录`);
              }
            }
            await fs.rm(resolvedPath, { recursive, force: true });
            results.push({
              index: i,
              path: filePath,
              success: true,
              message: `目录删除成功`
            });
          } else {
            // 如果是文件，直接删除
            await fs.unlink(resolvedPath);
            results.push({
              index: i,
              path: filePath,
              success: true,
              message: `文件删除成功`
            });
          }
        } catch (error: any) {
          if (error.code === 'ENOENT' && force) {
            results.push({
              index: i,
              path: filePath,
              success: true,
              message: `路径不存在，由于 force=true，操作成功完成`
            });
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误';

        if (continueOnError) {
          results.push({
            index: i,
            path: filePath,
            success: false,
            message: `删除失败`,
            error: errorMessage
          });
        } else {
          // 如果不继续处理错误，抛出异常
          throw new Error(`第 ${i + 1} 个项目删除失败: ${errorMessage}`);
        }
      }
    }

    // 收集失败的路径
    const failedPaths = results
      .filter(r => !r.success)
      .map(r => r.path);

    // 构建返回结果
    const result: any = {
      success: true
    };

    if (failedPaths.length === 0) {
      // 全部成功
      result.message = '删除完成';
    } else {
      // 有失败的项目
      result.message = `删除完成，但有 ${failedPaths.length} 个项目失败`;
      result.failed_paths = failedPaths;
    }

    return result;
  }
};