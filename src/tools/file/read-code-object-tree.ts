import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { ToolDefinition } from '../../types';

const configManager = ConfigManager.getInstance();

interface ReadCodeObjectTreeParameters {
  path: string;
  include_functions?: boolean;
  include_classes?: boolean;
  include_interfaces?: boolean;
  include_types?: boolean;
  include_constants?: boolean;
  include_variables?: boolean;
  include_imports?: boolean;
  include_exports?: boolean;
  max_depth?: number;
  encoding?: string;
}

interface CodeObject {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable' | 'import' | 'export';
  line: number;
  comment?: string;
  signature?: string;
  children?: CodeObject[];
}

interface ReadCodeObjectTreeResult {
  objects: CodeObject[];
  total_objects: number;
  file_path: string;
  file_name: string;
  file_size: number;
  last_modified: string;
}

const readCodeObjectTreeTool = {
  definition: {
    name: 'read_code_object_tree',
    description: '读取代码文件对象树，包含对象的注释。支持提取函数、类、接口、类型、常量、变量、导入、导出等代码对象。',
    
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作目录）'
        },
        include_functions: {
          type: 'boolean',
          description: '是否包含函数（可选）',
          default: true
        },
        include_classes: {
          type: 'boolean',
          description: '是否包含类（可选）',
          default: true
        },
        include_interfaces: {
          type: 'boolean',
          description: '是否包含接口（可选）',
          default: true
        },
        include_types: {
          type: 'boolean',
          description: '是否包含类型定义（可选）',
          default: true
        },
        include_constants: {
          type: 'boolean',
          description: '是否包含常量（可选）',
          default: true
        },
        include_variables: {
          type: 'boolean',
          description: '是否包含变量（可选）',
          default: true
        },
        include_imports: {
          type: 'boolean',
          description: '是否包含导入（可选）',
          default: true
        },
        include_exports: {
          type: 'boolean',
          description: '是否包含导出（可选）',
          default: true
        },
        max_depth: {
          type: 'integer',
          description: '最大解析深度（可选）',
          default: 10,
          minimum: 1,
          maximum: 100
        },
        encoding: {
          type: 'string',
          description: '文件编码（可选）',
          default: 'utf-8'
        }
      },
      required: ['path']
    }
  } as ToolDefinition,

  async execute(parameters: Record<string, any>): Promise<any> {
    const {
      path: filePath,
      include_functions: includeFunctions = true,
      include_classes: includeClasses = true,
      include_interfaces: includeInterfaces = true,
      include_types: includeTypes = true,
      include_constants: includeConstants = true,
      include_variables: includeVariables = true,
      include_imports: includeImports = true,
      include_exports: includeExports = true,
      max_depth: maxDepth = 10,
      encoding = 'utf-8'
    } = parameters as ReadCodeObjectTreeParameters;

    // 验证路径
    const resolvedPath = configManager.validatePath(filePath, true);
    
    // 检查文件是否为文本文件
    if (!configManager.isTextFile(resolvedPath)) {
      throw new Error(`不支持读取此类文件: ${filePath}，该文件可能不是文本文件`);
    }

    // 检查文件大小
    const stats = await fs.stat(resolvedPath);
    const config = configManager.getConfig();
    if (stats.size > config.maxFileSize) {
      throw new Error(`文件太大 (${stats.size} bytes)，最大支持 ${config.maxFileSize} bytes`);
    }

    // 读取文件内容
    const content = await fs.readFile(resolvedPath, { encoding: encoding as BufferEncoding });
    const lines = content.split('\n');
    
    // 获取文件信息
    const fileName = path.basename(resolvedPath);
    const fileSize = stats.size;
    const lastModified = stats.mtime.toISOString();

    // 解析代码对象
    const objects = await parseCodeObjects(
      lines,
      {
        includeFunctions,
        includeClasses,
        includeInterfaces,
        includeTypes,
        includeConstants,
        includeVariables,
        includeImports,
        includeExports,
        maxDepth
      }
    );

    // 返回结果
    const result: ReadCodeObjectTreeResult = {
      objects,
      total_objects: objects.length,
      file_path: resolvedPath,
      file_name: fileName,
      file_size: fileSize,
      last_modified: lastModified
    };
    
    return {
      success: true,
      result: result
    };
  }
};

// 解析代码对象的辅助函数
async function parseCodeObjects(
  lines: string[],
  options: {
    includeFunctions: boolean;
    includeClasses: boolean;
    includeInterfaces: boolean;
    includeTypes: boolean;
    includeConstants: boolean;
    includeVariables: boolean;
    includeImports: boolean;
    includeExports: boolean;
    maxDepth: number;
  }
): Promise<CodeObject[]> {
  const objects: CodeObject[] = [];
  let currentComment: string[] = [];
  let inMultiLineComment = false;
  let multiLineCommentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // 处理单行注释
    if (line.startsWith('//')) {
      currentComment.push(line.substring(2).trim());
      continue;
    }

    // 处理多行注释开始
    if (line.includes('/*')) {
      inMultiLineComment = true;
      const commentStart = line.indexOf('/*');
      const commentContent = line.substring(commentStart + 2);
      if (commentContent.includes('*/')) {
        // 单行多行注释
        const commentEnd = commentContent.indexOf('*/');
        currentComment.push(commentContent.substring(0, commentEnd).trim());
        inMultiLineComment = false;
      } else {
        multiLineCommentContent.push(commentContent.trim());
      }
      continue;
    }

    // 处理多行注释内容
    if (inMultiLineComment) {
      if (line.includes('*/')) {
        const commentEnd = line.indexOf('*/');
        multiLineCommentContent.push(line.substring(0, commentEnd).trim());
        currentComment.push(multiLineCommentContent.join(' '));
        multiLineCommentContent = [];
        inMultiLineComment = false;
      } else {
        multiLineCommentContent.push(line.trim());
      }
      continue;
    }

    // 解析导入语句
    if (options.includeImports && line.startsWith('import ')) {
      const importMatch = line.match(/import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        objects.push({
          name: importMatch[1],
          type: 'import',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析导出语句
    if (options.includeExports && line.startsWith('export ')) {
      const exportLine = line.substring(7).trim();
      
      // 导出函数
      if (options.includeFunctions && exportLine.startsWith('function ')) {
        const funcMatch = exportLine.match(/function\s+(\w+)/);
        if (funcMatch) {
          objects.push({
            name: funcMatch[1],
            type: 'function',
            line: lineNumber,
            comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
            signature: line
          });
          currentComment = [];
        }
      }
      
      // 导出类
      if (options.includeClasses && exportLine.startsWith('class ')) {
        const classMatch = exportLine.match(/class\s+(\w+)/);
        if (classMatch) {
          objects.push({
            name: classMatch[1],
            type: 'class',
            line: lineNumber,
            comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
            signature: line
          });
          currentComment = [];
        }
      }
      
      // 导出接口
      if (options.includeInterfaces && exportLine.startsWith('interface ')) {
        const interfaceMatch = exportLine.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
          objects.push({
            name: interfaceMatch[1],
            type: 'interface',
            line: lineNumber,
            comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
            signature: line
          });
          currentComment = [];
        }
      }
      
      // 导出类型
      if (options.includeTypes && exportLine.startsWith('type ')) {
        const typeMatch = exportLine.match(/type\s+(\w+)/);
        if (typeMatch) {
          objects.push({
            name: typeMatch[1],
            type: 'type',
            line: lineNumber,
            comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
            signature: line
          });
          currentComment = [];
        }
      }
      
      // 导出常量
      if (options.includeConstants && exportLine.startsWith('const ')) {
        const constMatch = exportLine.match(/const\s+(\w+)/);
        if (constMatch) {
          objects.push({
            name: constMatch[1],
            type: 'constant',
            line: lineNumber,
            comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
            signature: line
          });
          currentComment = [];
        }
      }
      
      continue;
    }

    // 解析函数（非导出）
    if (options.includeFunctions && line.startsWith('function ')) {
      const funcMatch = line.match(/function\s+(\w+)/);
      if (funcMatch) {
        objects.push({
          name: funcMatch[1],
          type: 'function',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析类（非导出）
    if (options.includeClasses && line.startsWith('class ')) {
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        objects.push({
          name: classMatch[1],
          type: 'class',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析接口（非导出）
    if (options.includeInterfaces && line.startsWith('interface ')) {
      const interfaceMatch = line.match(/interface\s+(\w+)/);
      if (interfaceMatch) {
        objects.push({
          name: interfaceMatch[1],
          type: 'interface',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析类型定义（非导出）
    if (options.includeTypes && line.startsWith('type ')) {
      const typeMatch = line.match(/type\s+(\w+)/);
      if (typeMatch) {
        objects.push({
          name: typeMatch[1],
          type: 'type',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析常量（非导出）
    if (options.includeConstants && line.startsWith('const ')) {
      const constMatch = line.match(/const\s+(\w+)/);
      if (constMatch) {
        objects.push({
          name: constMatch[1],
          type: 'constant',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 解析变量（非导出）
    if (options.includeVariables && (line.startsWith('let ') || line.startsWith('var '))) {
      const varMatch = line.match(/(?:let|var)\s+(\w+)/);
      if (varMatch) {
        objects.push({
          name: varMatch[1],
          type: 'variable',
          line: lineNumber,
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          signature: line
        });
        currentComment = [];
      }
      continue;
    }

    // 如果不是注释或代码对象定义，清空当前注释
    if (line && !line.startsWith('//') && !line.includes('/*')) {
      currentComment = [];
    }
  }

  return objects;
}

export { readCodeObjectTreeTool };