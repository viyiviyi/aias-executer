import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface PasswordItem {
  placeholder: string;
  value: string;
  description?: string;
  sensitive?: boolean;
}

export interface PasswordConfig {
  accounts: PasswordItem[];
}

export class PasswordManager {
  private static instance: PasswordManager;
  private configPath: string;
  private passwordItems: PasswordItem[] = [];
  private passwordMap: Map<string, string> = new Map();

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'passwords.yaml');
    this.loadPasswords();
  }

  public static getInstance(): PasswordManager {
    if (!PasswordManager.instance) {
      PasswordManager.instance = new PasswordManager();
    }
    return PasswordManager.instance;
  }

  private loadPasswords(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const parsed = yaml.load(fileContent) as PasswordConfig;
        
        if (parsed && parsed.accounts && Array.isArray(parsed.accounts)) {
          this.passwordItems = parsed.accounts;
          this.passwordMap.clear();
          
          // 构建快速查找的映射
          for (const item of this.passwordItems) {
            if (item.placeholder && item.value) {
              this.passwordMap.set(item.placeholder, item.value);
            }
          }
          
          console.log(`✅ 已加载 ${this.passwordItems.length} 个密码配置`);
        } else {
          console.warn(`⚠️  密码配置文件格式不正确: ${this.configPath}`);
        }
      } else {
        console.warn(`⚠️  密码配置文件不存在: ${this.configPath}`);
      }
    } catch (error) {
      console.error(`❌ 加载密码配置失败:`, error);
    }
  }

  /**
   * 替换参数中的占位符
   */
  public replacePlaceholders(parameters: Record<string, any>): Record<string, any> {
    if (this.passwordMap.size === 0) {
      return parameters;
    }

    const result = JSON.parse(JSON.stringify(parameters));
    
    const replaceInObject = (obj: any): any => {
      if (typeof obj === 'string') {
        // 替换字符串中的占位符
        let replaced = obj;
        for (const [placeholder, value] of this.passwordMap.entries()) {
          if (replaced.includes(placeholder)) {
            replaced = replaced.replace(new RegExp(placeholder, 'g'), value);
          }
        }
        return replaced;
      } else if (Array.isArray(obj)) {
        // 递归处理数组
        return obj.map(item => replaceInObject(item));
      } else if (typeof obj === 'object' && obj !== null) {
        // 递归处理对象
        const newObj: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          newObj[key] = replaceInObject(value);
        }
        return newObj;
      } else {
        // 其他类型直接返回
        return obj;
      }
    };

    return replaceInObject(result);
  }

  /**
   * 获取所有可用的占位符
   */
  public getAvailablePlaceholders(): string[] {
    return Array.from(this.passwordMap.keys());
  }

  /**
   * 获取所有密码项（包含描述信息）
   */
  public getPasswordItems(): PasswordItem[] {
    return [...this.passwordItems];
  }

  /**
   * 重新加载密码配置
   */
  public reload(): void {
    this.passwordItems = [];
    this.passwordMap.clear();
    this.loadPasswords();
  }
}