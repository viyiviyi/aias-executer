import { Config } from '../types';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  private configPath: string;

  private constructor() {
    this.configPath = this.findConfigFile();
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

  private findConfigFile(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'config.yaml'),
      path.join(process.cwd(), 'config.yml'),
      path.join(process.cwd(), 'config.json'),
      path.join(process.cwd(), 'config', 'config.yaml'),
      path.join(process.cwd(), 'config', 'config.yml'),
      path.join(process.cwd(), 'config', 'config.json'),
      '/app/config/config.yaml',
      '/app/config/config.yml',
      '/app/config/config.json',
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        console.log(`找到配置文件: ${configPath}`);
        return configPath;
      }
    }

    console.log('未找到配置文件，使用环境变量和默认配置');
    return '';
  }

  private loadConfig(): Config {
    let configData: any = {};

    // 1. 从配置文件加载
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');

        if (this.configPath.endsWith('.yaml') || this.configPath.endsWith('.yml')) {
          configData = yaml.load(fileContent);
        } else if (this.configPath.endsWith('.json')) {
          configData = JSON.parse(fileContent);
        }

        console.log(`从 ${this.configPath} 加载配置成功`);
      } catch (error) {
        console.error(`加载配置文件失败: ${error}`);
      }
    }

    // 2. 合并环境变量（环境变量优先级更高）
    const workspaceDir = process.env.WORKSPACE_DIR || configData.workspace?.dir || process.cwd();

    const allowedExtensions = (
      process.env.ALLOWED_EXTENSIONS ||
      configData.workspace?.allowedExtensions?.join(',') ||
      '.txt,.md,.py,.js,.ts,.java,.cs,.dart,.json,.tsx,.jsx,.html,.css,.xml,.yaml,.yml,.toml,.ini,.sh,.bash,.ps1,.sql,.go,.rs,.cpp,.c,.h,.hpp,.php,.rb,.swift,.kt,.scala,.lua,.r,.m,.f,.for,.f90,.f95'
    ).split(',');

    const allowedCommands = (
      process.env.ALLOWED_COMMANDS ||
      configData.command?.allowedCommands?.join(',') ||
      '*'
    ).split(',');

    return {
      workspaceDir,
      maxFileSize: parseInt(
        process.env.MAX_FILE_SIZE || configData.workspace?.maxFileSize?.toString() || '10485760'
      ), // 10MB
      commandTimeout: parseInt(
        process.env.COMMAND_TIMEOUT || configData.command?.timeout?.toString() || '30'
      ),
      maxTerminals: parseInt(
        process.env.MAX_TERMINALS || configData.command?.maxTerminals?.toString() || '10'
      ),
      allowedCommands,
      allowedExtensions,
      pathValidation:
        process.env.PATH_VALIDATION !== 'false' && configData.workspace?.pathValidation !== false,
      port: parseInt(process.env.PORT || configData.server?.port?.toString() || '23777'),
      host: process.env.HOST || configData.server?.host || '0.0.0.0',
      configPath: this.configPath,
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
        throw new Error(
          `命令 ${firstWord} 不被允许。允许的命令: ${this.config.allowedCommands.join(', ')}`
        );
      }
    }
    return command;
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
    console.log('配置已重新加载');
  }
}
