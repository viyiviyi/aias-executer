import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AutostartManager } from './core/autostart-manager';
import { ConfigManager } from './core/config';
import { registerAllTools } from './tools';
import staticRouter from './api/static';
import toolsRouter from './api/tools';
import { MCPClientManager } from './core/mcp-client';

// 注册所有基础工具
registerAllTools();

const configManager = ConfigManager.getInstance();
const config = configManager.getConfig();

const app = express();

// 中间件
app.use(helmet());
app.use(
  cors({
    origin: '*', // 允许所有域名
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// 全局缓存控制中间件 - 为所有GET请求添加no-cache头
app.use((req, res, next) => {
  // 如果是GET请求，设置缓存控制头
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
// 自启动脚本状态端点
app.get('/api/autostart/status', (_req, res) => {
  try {
    const autostartManager = AutostartManager.getInstance();
    const status = autostartManager.getScriptsStatus();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      scripts: status,
      total: status.length,
      loaded: status.filter((s) => s.status === 'loaded').length,
      errors: status.filter((s) => s.status === 'error').length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API路由 - 简化接口
app.use('/api', toolsRouter);
app.use('/api/static', staticRouter);


// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'AIAS Executor',
    description:
      'AI Agent System Executor - A clean and efficient tool executor for OpenAI function calling',
    version: '1.0.0',
    endpoints: {
      tools: '/api/tools',
      execute: '/api/execute',
      health: '/api/health',
      autostartStatus: '/api/autostart/status',
      staticFiles: '/api/static/files/*',
    },
  });
});
// 启动服务器
const PORT = config.port || 23777;
const HOST = config.host || '0.0.0.0';

// 异步启动
async function startServer() {
  try {
    try {
      const mcpClient = MCPClientManager.getInstance();
      await mcpClient.loadConfig()
      mcpClient.connectAllServers();
    } catch (error) {
      console.error(error)
    }
    try {
      // 初始化自启动脚本管理器
      const autostartManager = AutostartManager.getInstance();
      // 加载并执行所有自启动脚本
      console.log('🚀 开始加载自启动脚本...');
      autostartManager.loadAllScripts();
    } catch (error) {
      console.error(error)
    }

    // 然后启动HTTP服务器
    app.listen(PORT, HOST, () => {
      console.log(`服务器运行在 http://${HOST}:${PORT}`);
      console.log('可用端点:');
      console.log(`  GET  /              - 项目信息`);
      console.log(`  GET  /health        - 健康检查`);
      console.log(`  GET  /api/tools     - 获取所有工具`);
      console.log(`  POST /api/execute   - 执行工具`);
      console.log(`  GET  /api/autostart/status - 自启动脚本状态`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}
// 进程退出时的清理逻辑
process.on('SIGINT', async () => {
  console.log('\n🛑 收到SIGINT信号，正在退出...');
  try {
    const autostartManager = AutostartManager.getInstance();
    await autostartManager.cleanup();
  } catch (error) {
    console.error('清理自启动脚本失败:', error);
  }
  try {
    const mcpClient = MCPClientManager.getInstance();
    await mcpClient.disconnectAllServers();
  } catch (error) {
    console.error('关闭所有mcp服务连接失败:', error);
  }
  console.log('👋 进程退出');
  process.exit(0);
});

startServer();
