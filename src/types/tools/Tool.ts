import { ToolDefinition } from "./ToolDefinition";

export interface Tool {
    groupName?: string,
    definition: ToolDefinition;
    execute: (parameters: Record<string, any>) => Promise<any>;
}
