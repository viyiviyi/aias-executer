import { Router } from 'express';
import { ToolExecutor } from '../core/executor';
import { OpenAIFunctionCall, ToolCallRequest, BatchToolCallRequest } from '../types';

const router = Router();
const toolExecutor = new ToolExecutor();

// 获取工具列表
router.get('/', (_req, res) => {
  try {
    const tools = toolExecutor.getToolDefinitions();
    res.json({
      tools,
      count: tools.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行单个工具
router.post('/execute', async (req, res) => {
  try {
    const request = req.body as OpenAIFunctionCall | ToolCallRequest;
    const result = await toolExecutor.executeOpenAIFunctionCall(request);
    
    // 直接返回执行结果，不添加额外包装
    if (result.success) {
      res.json(result.result);
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量执行工具
router.post('/execute/batch', async (req, res) => {
  try {
    const batchRequest = req.body as BatchToolCallRequest;
    const requests = batchRequest.requests || [];
    
    if (requests.length > 10) {
      res.status(400).json({
        success: false,
        error: '批量请求最多支持10个工具'
      });
      return;
    }

    const results = [];
    for (let i = 0; i < requests.length; i++) {
      try {
        const result = await toolExecutor.executeOpenAIFunctionCall(requests[i]);
        results.push({
          index: i,
          ...result
        });
      } catch (error: any) {
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      batch_results: results,
      total: results.length,
      successful,
      failed
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取可用工具名称
router.get('/available', (_req, res) => {
  try {
    const tools = toolExecutor.getAvailableTools();
    res.json({
      tools,
      count: tools.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;