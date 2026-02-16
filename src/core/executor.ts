import { ToolDefinition, ToolExecutionResult, OpenAIFunctionCall, ToolCallRequest } from '../types';
import { ConfigManager } from './config';
import { ToolRegistry } from './tool-registry';

export class ToolExecutor {
  private configManager: ConfigManager;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.toolRegistry = ToolRegistry.getInstance();
  }

  public async executeTool(toolName: string, parameters: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      const tool = this.toolRegistry.getTool(toolName);
      if (!tool) {
        return {
          success: false,
          error: `工具不存在: ${toolName}`
        };
      }

      const result = await tool.execute(parameters);
      return {
        success: true,
        result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '执行工具时出错'
      };
    }
  }

  public parseOpenAIFunctionCall(request: OpenAIFunctionCall | ToolCallRequest): { toolName: string; parameters: Record<string, any> } {
    // 检查是否是OpenAI格式
    if ('function' in request) {
      const functionData = request.function;
      let parameters: Record<string, any>;
      
      if (typeof functionData.arguments === 'string') {
        try {
          parameters = JSON.parse(functionData.arguments);
        } catch {
          parameters = {};
        }
      } else {
        parameters = functionData.arguments;
      }

      return {
        toolName: functionData.name,
        parameters
      };
    } else {
      // 原有格式
      return {
        toolName: request.tool,
        parameters: request.parameters || {}
      };
    }
  }

  public async executeOpenAIFunctionCall(request: OpenAIFunctionCall | ToolCallRequest): Promise<ToolExecutionResult> {
    const { toolName, parameters } = this.parseOpenAIFunctionCall(request);
    return this.executeTool(toolName, parameters);
  }

  public getToolDefinitions(): ToolDefinition[] {
    return this.toolRegistry.getAllToolDefinitions();
  }

  public getAvailableTools(): string[] {
    return this.toolRegistry.getAvailableTools();
  }
}