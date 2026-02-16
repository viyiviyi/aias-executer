import { ToolDefinition } from '../types';

export interface Tool {
  definition: ToolDefinition;
  execute: (parameters: Record<string, any>) => Promise<any>;
}

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

  public registerTool(name: string, tool: Tool): void {
    this.tools.set(name, tool);
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