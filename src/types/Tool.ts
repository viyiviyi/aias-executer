import { ToolDefinition } from "./ToolDefinition";

export interface Tool {
    definition: ToolDefinition;
    execute: (parameters: Record<string, any>) => Promise<any>;
}
