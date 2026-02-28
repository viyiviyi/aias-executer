import { Tool } from "@/types/Tool";
import { ToolDefinition } from "@/types/ToolDefinition";


export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {
    this.registerDefaultTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  // 注册工具（支持两种方式）
  public registerTool(name: string, tool: Tool): void;
  public registerTool(definition: ToolDefinition, execute: (parameters: Record<string, any>) => Promise<any>): void;
  public registerTool(
    arg1: string | ToolDefinition,
    arg2?: Tool | ((parameters: Record<string, any>) => Promise<any>)
  ): void {
    if (typeof arg1 === 'string') {
      // 第一种方式：registerTool(name, tool)
      this.tools.set(arg1, arg2 as Tool);
    } else {
      // 第二种方式：registerTool(definition, execute)
      const definition = arg1 as ToolDefinition;
      const execute = arg2 as (parameters: Record<string, any>) => Promise<any>;
      this.tools.set(definition.name, { definition, execute });
    }
  }

  // 注销工具
  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  public getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  private registerDefaultTools(): void {
    // 这里会注册所有默认工具
    // 工具的具体实现在各自的模块中注册
  }

  public registerToolsFromModule(moduleTools: Record<string, Tool>): void {
    for (const [name, tool] of Object.entries(moduleTools)) {
      this.registerTool(name, tool);
    }
  }
}