import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '../../core/tool-registry';
import { validateParameters } from '../../core/error-utils';

const configManager = ConfigManager.getInstance();

export const writeFileTool: Tool = {
  definition: {
    name: 'write_file',
    description: '写入文件内容',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）'
        },
        content: {
          type: 'string',
          description: '要写入的内容'
        },
        encoding: {
          type: 'string',
          description: '文件编码（可选）',
          default: 'utf-8'
        },
        append: {
          type: 'boolean',
          description: '是否追加到文件末尾（可选，不自动换行）',
          default: false
        }
      },
      required: ['path', 'content']
    },

    // MCP构建器建议的元数据
    metadata: {
      readOnlyHint: false,      // 非只读操作（写入操作）
      destructiveHint: true,    // 破坏性操作（可能覆盖现有文件）
      idempotentHint: false,    // 非幂等操作（多次写入可能产生不同结果）
      openWorldHint: false,     // 不是开放世界操作
      category: 'file',         // 文件操作类别
      version: '1.0.0',        // 工具版本
      tags: ['file', 'write', 'create', 'modify'] // 工具标签
    },

    // 结构化输出模式
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '操作是否成功' },
        result: { type: 'string', description: '操作结果消息' },
        path: { type: 'string', description: '文件路径' },
        char_count: { type: 'integer', description: '写入的字符数' },
        line_count: { type: 'integer', description: '写入的行数' }
      },
      required: ['success', 'result', 'path', 'char_count', 'line_count']
    },

    // 使用指南
    guidelines: [
      '如果文件已存在且append为false，则会覆盖原文件',
      '使用append: true可以在文件末尾追加内容',
      '会自动创建不存在的目录',
      '支持各种编码格式，默认为utf-8'
    ],
  },

  async execute(parameters: Record<string, any>): Promise<any> {
    // 参数验证
    validateParameters(parameters, ['path', 'content'], {
      encoding: (value) => typeof value === 'string',
      append: (value) => typeof value === 'boolean'
    });

    const filePath = parameters.path;
    const content = parameters.content;
    const encoding = parameters.encoding || 'utf-8';
    const append = parameters.append || false;

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath);

    // 注意：不验证文件扩展名，允许写入任何类型的文件

    // 确保目录存在
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    // 计算写入内容的统计信息
    const charCount = content.length;
    const lineCount = content.split('\n').length;

    // 写入文件
    if (append) {
      await fs.appendFile(resolvedPath, content, encoding);
    } else {
      await fs.writeFile(resolvedPath, content, encoding);
    }

    return {
      success: true,
      result: '文件写入成功',
      path: filePath,
      char_count: charCount,
      line_count: lineCount
    };
  }
};