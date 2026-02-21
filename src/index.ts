import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ConfigManager } from './core/config';
import { registerAllTools } from './tools';
import { MCPToolManager } from './core/mcp-tool-manager';
import toolsRouter from './api/tools';

// 注册所有基础工具
registerAllTools();

const configManager = ConfigManager.getInstance();
const config = configManager.getConfig();

const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: '*', // 允许所有域名
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
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

// 初始化MCP工具管理器
async function initializeMCPTools() {
  try {
    const mcpToolManager = MCPToolManager.getInstance();
    await mcpToolManager.initialize();
    console.log('MCP工具管理器初始化成功');
  } catch (error) {
    console.error('初始化MCP工具管理器失败:', error);
  }
}

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由 - 简化接口
app.use('/api', toolsRouter);

// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'AIAS Executor',
    description: 'AI Agent System Executor - A clean and efficient tool executor for OpenAI function calling',
    version: '1.0.0',
    endpoints: {
      tools: '/api/tools',
      execute: '/api/execute',
      health: '/health'
    }
  });
});

// 启动服务器
// 启动服务器
const PORT = config.port || 3000;
const HOST = config.host || '0.0.0.0';

// 异步启动
async function startServer() {
  try {
    // 先初始化MCP工具
    initializeMCPTools();
    
    // 然后启动HTTP服务器
    app.listen(PORT, HOST, () => {
      console.log(`服务器运行在 http://${HOST}:${PORT}`);
      console.log('可用端点:');
      console.log(`  GET  /              - 项目信息`);
      console.log(`  GET  /health        - 健康检查`);
      console.log(`  GET  /api/tools     - 获取所有工具`);
      console.log(`  POST /api/execute   - 执行工具`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();