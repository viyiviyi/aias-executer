import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const execAsync = promisify(exec);
const configManager = ConfigManager.getInstance();

interface SkillCommand {
  type: 'node' | 'python' | 'shell' | 'binary' | 'document';
  command: string;
  args: string[];
  workdir: string;
  env?: Record<string, string>;
}

/**
 * 检测skill类型并构建执行命令
 */
async function detectSkillCommand(
  skillPath: string, 
  action: string, 
  parameters: Record<string, any>
): Promise<SkillCommand | null> {
  try {
    // 1. 检查是否有scripts目录
    const scriptsPath = path.join(skillPath, 'scripts');
    try {
      const scriptsStat = await fs.stat(scriptsPath);
      if (scriptsStat.isDirectory()) {
        // 检查是否有对应的脚本文件
        const possibleScripts = [
          `${action}.js`,
          `${action}.ts`,
          `${action}.py`,
          `${action}.sh`,
          `cli.js`,
          `index.js`
        ];
        
        for (const script of possibleScripts) {
          const scriptPath = path.join(scriptsPath, script);
          try {
            await fs.access(scriptPath);
            
            // 构建参数
            const args: string[] = [];
            for (const [key, value] of Object.entries(parameters)) {
              if (value !== undefined && value !== null) {
                args.push(`--${key}=${value}`);
              }
            }
            
            return {
              type: script.endsWith('.py') ? 'python' : 
                    script.endsWith('.sh') ? 'shell' : 'node',
              command: script.endsWith('.py') ? 'python' : 
                       script.endsWith('.sh') ? 'bash' : 'node',
              args: [script, ...args],
              workdir: scriptsPath
            };
          } catch (error) {
            // 脚本文件不存在，继续尝试下一个
            continue;
          }
        }
      }
    } catch (error) {
      // scripts目录不存在
    }
    
    // 2. 检查是否有package.json和bin字段
    const packageJsonPath = path.join(skillPath, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      if (packageJson.bin) {
        // 有bin字段，可能是全局安装的CLI工具
        let binCommand: string;
        if (typeof packageJson.bin === 'string') {
          binCommand = packageJson.bin;
        } else if (packageJson.bin[action]) {
          binCommand = packageJson.bin[action];
        } else {
          // 使用第一个bin命令
          const firstBin = Object.values(packageJson.bin)[0];
          if (typeof firstBin === 'string') {
            binCommand = firstBin;
          } else {
            return null;
          }
        }
        
        // 构建参数
        const args: string[] = [action];
        for (const [key, value] of Object.entries(parameters)) {
          if (value !== undefined && value !== null) {
            args.push(`--${key}=${value}`);
          }
        }
        
        return {
          type: 'binary',
          command: binCommand,
          args,
          workdir: skillPath
        };
      }
    } catch (error) {
      // package.json不存在或解析失败
    }
    
    // 3. 检查是否有可执行文件
    const possibleExecutables = [
      path.join(skillPath, action),
      path.join(skillPath, `${action}.exe`),
      path.join(skillPath, 'cli'),
      path.join(skillPath, 'cli.exe')
    ];
    
    for (const execPath of possibleExecutables) {
      try {
        await fs.access(execPath);
        // 检查文件状态
        await fs.stat(execPath);
        
        // 构建参数
        const args: string[] = [];
        for (const [key, value] of Object.entries(parameters)) {
          if (value !== undefined && value !== null) {
            args.push(`--${key}=${value}`);
          }
        }
        
        return {
          type: 'binary',
          command: execPath,
          args,
          workdir: skillPath
        };
      } catch (error) {
        // 文件不存在或不可访问
        continue;
      }
    }
    
    // 4. 只有文档，没有可执行文件
    return {
      type: 'document',
      command: 'echo',
      args: ['This skill only contains documentation. Please read the SKILL.md file.'],
      workdir: skillPath
    };
    
  } catch (error) {
    console.error('检测skill命令失败:', error);
    return null;
  }
}

/**
 * 执行命令并返回结果
 */
async function executeCommand(skillCommand: SkillCommand, timeout: number = 30000): Promise<any> {
  try {
    const { command, args, workdir, env = {} } = skillCommand;
    
    // 构建完整的命令
    const fullCommand = `${command} ${args.join(' ')}`;
    
    // 设置环境变量
    const processEnv = {
      ...process.env,
      ...env,
      SKILL_WORKDIR: workdir
    };
    
    // 执行命令
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: workdir,
      env: processEnv,
      timeout: timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB缓冲区
    });
    
    // 尝试解析JSON输出
    try {
      const jsonResult = JSON.parse(stdout);
      return {
        success: true,
        result: jsonResult,
        stderr: stderr || null
      };
    } catch (error) {
      // 不是JSON，返回原始输出
      return {
        success: true,
        result: stdout,
        stderr: stderr || null
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '执行命令失败',
      stderr: error.stderr || null,
      stdout: error.stdout || null
    };
  }
}

export const executeSkillTool: Tool = {
  definition: {
    name: 'utils_execute_skill',
    groupName: '技能工具',
    description: '执行指定的skill命令，自动检测skill类型并执行',
    parameters: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          description: 'skill名称（在skills目录下的目录名）'
        },
        action: {
          type: 'string',
          description: '要执行的动作/命令'
        },
        parameters: {
          type: 'object',
          description: '动作参数',
          default: {}
        },
        skills_dir: {
          type: 'string',
          description: 'skills目录路径（相对于工作目录）',
          default: 'skills'
        },
        timeout: {
          type: 'number',
          description: '执行超时时间（毫秒）',
          default: 30000
        }
      },
      required: ['skill', 'action']
    }
  },
  
  execute: async (params: Record<string, any>) => {
    try {
      const {
        skill,
        action,
        parameters = {},
        skills_dir = 'skills',
        timeout = 30000
      } = params;
      
      // 验证必要参数
      if (!skill || !action) {
        return {
          success: false,
          error: '缺少必要参数: skill和action'
        };
      }
      
      const workspacePath = configManager.validatePath('.');
      const skillsPath = path.join(workspacePath, skills_dir);
      const skillPath = path.join(skillsPath, skill);
      
      // 检查skill目录是否存在
      try {
        await fs.access(skillPath);
      } catch (error) {
        return {
          success: false,
          error: `skill不存在: ${skill} (路径: ${skillPath})`
        };
      }
      
      // 检测skill类型并构建命令
      const skillCommand = await detectSkillCommand(skillPath, action, parameters);
      
      if (!skillCommand) {
        return {
          success: false,
          error: `无法检测skill类型或构建执行命令: ${skill}`,
          suggestion: '请检查skill是否有scripts目录、package.json或可执行文件'
        };
      }
      
      // 如果是文档类型，直接返回信息
      if (skillCommand.type === 'document') {
        // 尝试读取SKILL.md文件
        try {
          const skillMdPath = path.join(skillPath, 'SKILL.md');
          const skillMdContent = await fs.readFile(skillMdPath, 'utf-8');
          
          // 提取前200个字符作为预览
          const preview = skillMdContent.substring(0, 200) + 
                         (skillMdContent.length > 200 ? '...' : '');
          
          return {
            success: true,
            type: 'document',
            message: '此skill只包含文档，没有可执行脚本',
            skill_info: {
              name: skill,
              path: skillPath,
              preview: preview,
              full_content_length: skillMdContent.length
            },
            suggestion: '使用utils_read_file工具读取SKILL.md文件查看完整内容'
          };
        } catch (error) {
          return {
            success: true,
            type: 'document',
            message: '此skill只包含文档，但无法读取SKILL.md文件',
            skill_info: {
              name: skill,
              path: skillPath
            }
          };
        }
      }
      
      // 执行命令
      const result = await executeCommand(skillCommand, timeout);
      
      return {
        success: result.success,
        type: skillCommand.type,
        command: {
          executable: skillCommand.command,
          args: skillCommand.args,
          workdir: skillCommand.workdir
        },
        ...result
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '执行skill失败',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
};