import { ConfigManager } from './config';
import fs from 'fs';
import path from 'path';

export interface AutostartScript {
  name: string;
  path: string;
  module?: any;
  exports?: any;
  error?: Error;
}

export class AutostartManager {
  private static instance: AutostartManager;
  private scripts: AutostartScript[] = [];
  private autostartDir: string;
  private constructor() {
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();
    
    // 获取配置的自启动目录，默认为autoStart
    const autostartDirName = config.autostart?.dir || 'autoStart';
    
    // 优先使用配置的工作目录下的自启动目录
    // 如果不存在，则使用项目根目录的autostart目录
    const workspaceAutoStartDir = path.join(config.workspaceDir, autostartDirName);
    const projectAutoStartDir = path.join(config.workspaceDir, 'autostart');
    
    // 检查哪个目录存在
    if (fs.existsSync(workspaceAutoStartDir)) {
      this.autostartDir = workspaceAutoStartDir;
      console.log(`📁 使用工作目录自启动脚本: ${this.autostartDir}`);
    } else if (fs.existsSync(projectAutoStartDir)) {
      this.autostartDir = projectAutoStartDir;
      console.log(`📁 使用项目目录自启动脚本: ${this.autostartDir}`);
    } else {
      // 如果都不存在，使用工作目录的自启动目录（即使不存在也会创建）
      this.autostartDir = workspaceAutoStartDir;
      console.log(`📁 自启动脚本目录不存在，将使用: ${this.autostartDir}`);
    }
  }

  /**
   * 扫描autostart目录中的脚本文件
   */
  private scanScripts(): AutostartScript[] {
    const scripts: AutostartScript[] = [];

    try {
      // 检查目录是否存在，如果不存在则创建
      if (!fs.existsSync(this.autostartDir)) {
        console.log(`📁 创建自启动脚本目录: ${this.autostartDir}`);
        fs.mkdirSync(this.autostartDir, { recursive: true });
      }

      // 读取目录中的所有文件
      const files = fs.readdirSync(this.autostartDir);

      // 过滤出.js文件并按字母顺序排序
      const jsFiles = files
        .filter(file => file.endsWith('.js'))
        .sort();

      console.log(`📂 发现 ${jsFiles.length} 个自启动脚本`);

      // 创建脚本信息对象
      for (const file of jsFiles) {
        const scriptPath = path.join(this.autostartDir, file);
        scripts.push({
          name: file,
          path: scriptPath
        });
      }

    } catch (error) {
      console.error('❌ 扫描自启动脚本失败:', error);
    }

    return scripts;
  }
  public static getInstance(): AutostartManager {
    if (!AutostartManager.instance) {
      AutostartManager.instance = new AutostartManager();
    }
    return AutostartManager.instance;
  }


  /**
   * 加载并执行单个脚本
   */
  private async loadScript(script: AutostartScript): Promise<void> {
    try {
      console.log(`📦 加载脚本: ${script.name}`);

      // 删除缓存以确保每次都是重新加载
      delete require.cache[require.resolve(script.path)];

      // 加载脚本模块
      const module = require(script.path);
      script.module = module;
      script.exports = module;

      // 如果模块导出了initialize函数，则执行它
      if (typeof module.initialize === 'function') {
        console.log(`🚀 执行初始化: ${script.name}`);
        await module.initialize();
        console.log(`✅ 脚本初始化完成: ${script.name}`);
      } else {
        console.log(`ℹ️ 脚本已加载（无initialize函数）: ${script.name}`);
      }

    } catch (error) {
      script.error = error as Error;
      console.error(`❌ 加载脚本失败 ${script.name}:`, error);
    }
  }

  /**
   * 加载并执行所有自启动脚本
   */
  public async loadAllScripts(): Promise<void> {
    console.log('🔍 开始加载自启动脚本...');

    // 扫描脚本
    this.scripts = this.scanScripts();

    if (this.scripts.length === 0) {
      console.log('📭 没有找到自启动脚本');
      return;
    }

    // 按顺序加载所有脚本
    for (const script of this.scripts) {
      await this.loadScript(script);
    }

    console.log(`🎉 自启动脚本加载完成，共 ${this.scripts.length} 个脚本`);
    this.printSummary();
  }

  /**
   * 获取所有脚本的状态
   */
  public getScriptsStatus(): Array<{
    name: string;
    status: 'loaded' | 'error';
    error?: string;
  }> {
    return this.scripts.map(script => ({
      name: script.name,
      status: script.error ? 'error' : 'loaded',
      error: script.error?.message
    }));
  }

  /**
   * 打印加载摘要
   */
  private printSummary(): void {
    const loaded = this.scripts.filter(s => !s.error).length;
    const errors = this.scripts.filter(s => s.error).length;

    console.log('\n📊 自启动脚本加载摘要:');
    console.log(`   ✅ 成功加载: ${loaded}`);
    console.log(`   ❌ 加载失败: ${errors}`);

    if (errors > 0) {
      console.log('\n⚠️ 失败的脚本:');
      this.scripts
        .filter(s => s.error)
        .forEach(s => {
          console.log(`   - ${s.name}: ${s.error?.message}`);
        });
    }
  }

  /**
   * 清理所有脚本
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 清理自启动脚本...');

    for (const script of this.scripts) {
      try {
        // 如果脚本导出了cleanup函数，则执行它
        if (script.module && typeof script.module.cleanup === 'function') {
          console.log(`🧹 清理脚本: ${script.name}`);
          await script.module.cleanup();
        }
      } catch (error) {
        console.error(`❌ 清理脚本失败 ${script.name}:`, error);
      }
    }

    console.log('✅ 自启动脚本清理完成');
  }

  /**
   * 重新加载所有脚本
   */
  public async reloadAllScripts(): Promise<void> {
    console.log('🔄 重新加载自启动脚本...');
    
    // 先清理
    await this.cleanup();
    
    // 清空脚本列表
    this.scripts = [];
    
    // 重新加载
    await this.loadAllScripts();
  }
}