# 自启动脚本目录

此目录用于存放项目启动时自动执行的JavaScript脚本。

## 使用方法

1. 将你的JavaScript脚本文件（.js扩展名）放在此目录中
2. 项目启动时会自动加载并执行所有脚本
3. 脚本可以导出函数或直接执行代码

## 脚本示例

```javascript
// example-autostart.js
console.log('🔧 自启动脚本已加载');

// 执行初始化任务
module.exports = {
  initialize: async () => {
    console.log('🚀 执行初始化任务...');
    // 你的初始化代码
  }
};
```

## 注意事项

- 脚本按文件名字母顺序执行
- 脚本中的错误会被捕获并记录，不会影响主程序启动
- 建议将长时间运行的任务放在后台执行
- 脚本可以访问项目的所有模块和依赖

## 文件命名规范

建议使用有意义的名称，如：
- `database-init.js` - 数据库初始化
- `scheduler-start.js` - 定时任务启动
- `cache-warmup.js` - 缓存预热
- `monitoring-setup.js` - 监控设置
