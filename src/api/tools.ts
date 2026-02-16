import { Router } from 'express';
import { ToolExecutor } from '../core/executor';
import { OpenAIFunctionCall, ToolCallRequest } from '../types';

const router = Router();
const toolExecutor = new ToolExecutor();

// 获取工具列表 - 符合OpenAI funcall格式
router.get('/', (_req, res) => {
  try {
    const tools = toolExecutor.getToolDefinitions();
    res.json(tools);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行工具 - 符合OpenAI tool_call格式
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

export default router;