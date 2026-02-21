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
    if (this.configPath) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');

        if (this.configPath.endsWith('.yaml') || this.configPath.endsWith('.yml')) {
          configData = yaml.load(fileContent) || {};
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
      mcp: configData.mcp || {},
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
  public isTextFile(filePath: string): boolean {
    try {
      // 如果所有编码都失败，检查文件扩展名作为后备方案
      const textExtensions = [
        '.txt',
        '.md',
        '.py',
        '.js',
        '.ts',
        '.java',
        '.cs',
        '.dart',
        '.json',
        '.tsx',
        '.jsx',
        '.html',
        '.css',
        '.xml',
        '.yaml',
        '.yml',
        '.toml',
        '.ini',
        '.sh',
        '.bash',
        '.ps1',
        '.sql',
        '.go',
        '.rs',
        '.cpp',
        '.c',
        '.h',
        '.hpp',
        '.php',
        '.rb',
        '.swift',
        '.kt',
        '.scala',
        '.lua',
        '.r',
        '.m',
        '.f',
        '.for',
        '.f90',
        '.f95',
      ];

      const ext = path.extname(filePath).toLowerCase();
      if (textExtensions.includes(ext)) return true;
      else {
        // 首先尝试读取文件，如果能够以文本方式读取，则认为是文本文件
        const buffer = fs.readFileSync(filePath);

        // 尝试将buffer转换为字符串，如果成功则认为是文本文件
        // 使用多种编码尝试解码
        const encodings: BufferEncoding[] = ['utf-8', 'utf-16le', 'latin1', 'ascii'];

        for (const encoding of encodings) {
          try {
            const text = buffer.toString(encoding);
            // 检查是否包含过多的空字符（二进制文件的特征）
            const nullCount = (text.match(/\x00/g) || []).length;
            const nullRatio = nullCount / text.length;

            // 如果空字符比例小于5%，认为是文本文件
            if (nullRatio < 0.05) {
              return true;
            }
          } catch (e) {
            // 尝试下一个编码
            continue;
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  public getAllowedExtensions(): string[] {
    return [...this.config.allowedExtensions];
  }

  public isExtensionAllowed(filePath: string): boolean {
    try {
      const ext = path.extname(filePath).toLowerCase();

      // 如果允许所有扩展名
      if (this.config.allowedExtensions.includes('*')) {
        return true;
      }

      return this.config.allowedExtensions.includes(ext);
    } catch (error) {
      return false;
    }
  }

  public isCommandAllowed(command: string): boolean {
    // 如果允许所有命令
    if (this.config.allowedCommands.includes('*')) {
      return true;
    }

    return this.config.allowedCommands.includes(command);
  }
}
