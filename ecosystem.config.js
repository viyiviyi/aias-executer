// PM2生态系统配置文件
module.exports = {
  apps: [{
    // 应用名称
    name: 'aias-executor',
    
    // 生产环境脚本路径
    script: 'dist/index.js',
    
    // 开发环境脚本（使用ts-node-dev）
    script_dev: 'src/index.ts',
    
    // 实例数：1（单实例）或 max（根据CPU核心数）
    instances: 1,
    
    // 自动重启
    autorestart: true,
    
    // 文件变化监控（开发环境使用）
    watch: false,
    
    // 忽略监控的目录
    ignore_watch: [
      'node_modules',
      'logs',
      'workspace',
      '.git',
      'dist'
    ],
    
    // 最大内存限制，超过则重启
    max_memory_restart: '1G',
    
    // 日志文件配置
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    
    // 日志时间戳
    time: true,
    
    // 合并日志（所有实例的日志合并到一个文件）
    merge_logs: true,
    
    // 日志日期格式
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 启动延迟（毫秒）
    min_uptime: '10s',
    
    // 最大重启次数
    max_restarts: 10,
    
    // 重启延迟
    restart_delay: 2000,
    
    // 杀死进程的超时时间
    kill_timeout: 5000,
    
    // 监听就绪信号
    wait_ready: true,
    
    // 监听模式（开发环境）
    listen_timeout: 3000
  }]
};