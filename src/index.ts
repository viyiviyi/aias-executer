import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ConfigManager } from './core/config';
import { registerAllTools } from './tools';
import toolsRouter from './api/tools';

// 注册所有工具
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
      tools: '/tools',
      execute: '/execute',
      health: '/health'
    }
  });
});

// 错误处理中间件
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  // 出错时http需要是200
  res.status(200).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404处理 http状态码固定200
app.use((_req, res) => {
  res.status(200).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// 启动服务器
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  console.log(`AIAS Executor 服务器启动在 http://${HOST}:${PORT}`);
  console.log(`工作目录: ${config.workspaceDir}`);
});

export default app;