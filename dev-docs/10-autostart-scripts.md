# 自启动脚本功能

## 功能概述

AIAS Executor 现在支持自启动脚本功能。项目启动时会自动加载并执行 `autostart` 目录中的所有 JavaScript 脚本。

## 目录结构

```
/workspace/
├── autostart/              # 自启动脚本目录
│   ├── README.md          # 目录说明
│   ├── example-autostart.js # 示例脚本
│   ├── database-monitor.js # 数据库监控脚本
│   ├── scheduler-tasks.js  # 定时任务脚本
│   ├── system-monitor.js   # 系统监控脚本
│   └── test-script.js      # 测试脚本
└── ...
```

## 使用方法

### 1. 添加脚本
将 `.js` 文件放入 `autostart` 目录

### 2. 脚本格式
导出 `initialize` 函数（启动时调用）和 `cleanup` 函数（退出时调用）

### 3. 启动项目
脚本会在项目启动时自动加载执行

### 4. 监控状态
访问 `/api/autostart/status` 查看脚本状态

## 预置脚本功能

### 1. database-monitor.js
**功能描述**: 模拟数据库连接监控

**主要特性**:
- 模拟数据库连接状态检查
- 连接池监控和管理
- 性能指标收集
- 异常连接自动恢复

**使用场景**:
- 数据库健康监控
- 连接池优化
- 性能问题诊断

### 2. scheduler-tasks.js
**功能描述**: 定时任务调度器

**主要特性**:
- 支持Cron表达式定时任务
- 任务优先级管理
- 任务执行状态跟踪
- 失败任务重试机制

**使用场景**:
- 定期数据备份
- 系统维护任务
- 报表生成
- 缓存清理

### 3. system-monitor.js
**功能描述**: 系统资源监控

**主要特性**:
- CPU使用率监控
- 内存使用监控
- 磁盘空间监控
- 网络连接监控

**使用场景**:
- 系统性能监控
- 资源使用分析
- 容量规划
- 故障预警

### 4. example-autostart.js
**功能描述**: 简单示例脚本

**主要特性**:
- 基础脚本结构示例
- 日志记录示例
- 错误处理示例
- 配置管理示例

**使用场景**:
- 学习自启动脚本开发
- 测试脚本功能
- 开发新脚本模板

## 技术实现

### 核心模块
- **核心模块**: `src/core/autostart-manager.ts`
- **自动扫描**: 启动时扫描 `autostart` 目录
- **顺序执行**: 按文件名字母顺序执行脚本
- **错误隔离**: 单个脚本错误不影响其他脚本
- **清理机制**: 进程退出时自动调用清理函数

### 脚本接口规范

#### 基本结构
```javascript
// 示例脚本结构
module.exports = {
  /**
   * 初始化函数 - 项目启动时调用
   * @param {Object} context - 执行上下文
   * @param {Object} context.config - 项目配置
   * @param {Object} context.logger - 日志记录器
   * @returns {Promise<void>}
   */
  async initialize(context) {
    // 初始化逻辑
    context.logger.info('脚本初始化开始');
    
    // 执行初始化任务
    await this.setup();
    
    context.logger.info('脚本初始化完成');
  },

  /**
   * 清理函数 - 项目退出时调用
   * @param {Object} context - 执行上下文
   * @returns {Promise<void>}
   */
  async cleanup(context) {
    // 清理逻辑
    context.logger.info('脚本清理开始');
    
    // 执行清理任务
    await this.teardown();
    
    context.logger.info('脚本清理完成');
  },

  /**
   * 获取脚本信息
   * @returns {Object} 脚本信息
   */
  getInfo() {
    return {
      name: '脚本名称',
      version: '1.0.0',
      description: '脚本描述',
      author: '作者',
      enabled: true
    };
  }
};
```

#### 上下文对象
```javascript
{
  // 项目配置
  config: {
    server: { port: 23777, host: '0.0.0.0' },
    workspace: { dir: '/app/workspace', maxFileSize: 5242880 },
    command: { timeout: 300, allowedCommands: [], maxTerminals: 5 }
  },
  
  // 日志记录器
  logger: {
    debug: (message) => { /* 调试日志 */ },
    info: (message) => { /* 信息日志 */ },
    warn: (message) => { /* 警告日志 */ },
    error: (message) => { /* 错误日志 */ }
  },
  
  // 工具执行器
  executor: {
    executeTool: async (toolName, parameters) => { /* 执行工具 */ }
  },
  
  // 事件发射器
  events: {
    on: (eventName, handler) => { /* 监听事件 */ },
    emit: (eventName, data) => { /* 触发事件 */ }
  }
}
```

### 脚本管理API

#### 状态查询接口
```
GET /api/autostart/status
```

**响应格式**:
```json
{
  "success": true,
  "result": {
    "scripts": [
      {
        "name": "database-monitor",
        "status": "running",
        "startTime": "2026-02-22T08:32:40.055Z",
        "uptime": 3600000,
        "info": {
          "name": "数据库监控",
          "version": "1.0.0",
          "description": "数据库连接监控脚本"
        }
      }
    ],
    "total": 4,
    "running": 3,
    "failed": 1,
    "disabled": 0
  }
}
```

#### 脚本控制接口
```
POST /api/autostart/control
```

**请求格式**:
```json
{
  "action": "restart",
  "script": "database-monitor"
}
```

**可用操作**:
- `start`: 启动脚本
- `stop`: 停止脚本
- `restart`: 重启脚本
- `enable`: 启用脚本
- `disable`: 禁用脚本

### 错误处理机制

#### 脚本加载错误
- 语法错误检测
- 依赖缺失检查
- 接口规范验证

#### 脚本执行错误
- 初始化失败处理
- 运行时错误捕获
- 资源泄漏预防

#### 脚本清理错误
- 清理超时处理
- 资源释放验证
- 状态一致性保证

### 性能考虑

#### 启动性能
- 并行脚本初始化
- 懒加载机制
- 启动超时控制

#### 运行时性能
- 脚本资源使用监控
- 性能瓶颈分析
- 自动优化建议

#### 内存管理
- 内存泄漏检测
- 垃圾回收优化
- 资源使用限制

## 相关文档

### 详细使用指南
- 文件位置: `AUTOSTART-USAGE.md`
- 内容: 完整的使用说明和示例

### 示例脚本
- 目录位置: `autostart/` 目录
- 内容: 各种类型的示例脚本

### 核心实现
- 文件位置: `src/core/autostart-manager.ts`
- 内容: 自启动管理器的完整实现

## 版本信息

**自启动功能版本**: 1.0.0  
**最后更新**: 2026-02-22  
**状态**: 已集成到主项目中  
**监控端点**: `GET /api/autostart/status`  
**配置文件**: `/workspace/config/config.json`

## 最佳实践

### 脚本开发
1. **保持简洁**: 每个脚本专注于单一功能
2. **错误处理**: 完善的错误处理和恢复机制
3. **资源管理**: 及时释放占用的资源
4. **日志记录**: 详细的运行日志记录

### 脚本部署
1. **测试验证**: 在测试环境充分测试
2. **版本控制**: 使用语义化版本控制
3. **文档完善**: 提供完整的使用文档
4. **监控配置**: 配置适当的监控告警

### 脚本维护
1. **定期检查**: 定期检查脚本运行状态
2. **性能优化**: 持续优化脚本性能
3. **安全更新**: 及时应用安全更新
4. **兼容性**: 确保与主项目版本兼容