
export interface ToolDefinition {
    name: string;
    groupName?: string,
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
    result_use_type?: 'once' | 'last'; // once:仅在调用后加载在上下文一次；last: 直到下一个同名调用一直加载在上下文
    
    // 使用指南
    guidelines?: string[];
}