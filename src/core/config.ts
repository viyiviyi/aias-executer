import { Config } from '../types';
import path from 'path';
import fs from 'fs';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): Config {
    return { ...this.config };
  }

  private loadConfig(): Config {
    const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();
    
    return {
      workspaceDir,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
      commandTimeout: parseInt(process.env.COMMAND_TIMEOUT || '30'),
      maxTerminals: parseInt(process.env.MAX_TERMINALS || '10'),
      allowedCommands: (process.env.ALLOWED_COMMANDS || '*').split(','),
      allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.txt,.md,.py,.js,.ts,.java,.cs,.dart,.json,.tsx,.jsx,.html,.css').split(','),
      pathValidation: process.env.PATH_VALIDATION !== 'false',
      port: parseInt(process.env.PORT || '23777'),
      host: process.env.HOST || '0.0.0.0'
    };
  }

  public validatePath(filePath: string, mustExist: boolean = false): string {
    if (!this.config.pathValidation) {
      return path.resolve(this.config.workspaceDir, filePath);
    }

    const resolvedPath = path.resolve(this.config.workspaceDir, filePath);
    const workspacePath = path.resolve(this.config.workspaceDir);

    // 检查路径是否在工作空间内
    if (!resolvedPath.startsWith(workspacePath)) {
      throw new Error(`路径 ${filePath} 不在工作空间内`);
    }

    if (mustExist && !fs.existsSync(resolvedPath)) {
      throw new Error(`路径不存在: ${filePath}`);
    }

    return resolvedPath;
  }

  public validateFileExtension(filePath: string, allowedExtensions?: string[]): void {
    const extensions = allowedExtensions || this.config.allowedExtensions;
    const ext = path.extname(filePath).toLowerCase();
    
    if (!extensions.includes(ext)) {
      throw new Error(`文件类型 ${ext} 不被允许。允许的类型: ${extensions.join(', ')}`);
    }
  }

  public validateCommand(command: string): string {
    if (!this.config.allowedCommands.includes('*')) {
      const firstWord = command.split(' ')[0].toLowerCase();
      if (!this.config.allowedCommands.includes(firstWord)) {
        throw new Error(`命令 ${firstWord} 不被允许。允许的命令: ${this.config.allowedCommands.join(', ')}`);
      }
    }
    return command;
  }
}