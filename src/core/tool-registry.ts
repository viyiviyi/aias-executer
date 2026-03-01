/**
 * 工具注册表 - 管理所有可用工具
 */

import { Tool } from '@/types/tools/Tool';
import { ToolDefinition } from '@/types/tools/ToolDefinition';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * 注册工具
   */
  public registerTool(name: string, tool: Tool): void {
    this.tools.set(name, tool);
  }

  /**
   * 获取工具
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具定义
   */
  public getAllToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];
    for (const [, tool] of this.tools) {
      definitions.push(tool.definition);
    }
    return definitions;
  }

  /**
   * 获取所有可用工具名称
   */
  public getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否存在
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 清除所有工具
   */
  public clear(): void {
    this.tools.clear();
  }
}