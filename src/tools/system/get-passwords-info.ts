import { ToolDefinition } from '../../types';
import { PasswordManager } from '../../core/password-manager';

export const getPasswordsInfoTool = {
  definition: {
    name: 'get_passwords_info',
    description: '获取所有可用的账号密码和对应的占位符信息',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  } as ToolDefinition,

  execute: async (): Promise<any> => {
    try {
      const passwordManager = PasswordManager.getInstance();
      const items = passwordManager.getPasswordItems();
      
      // 只返回必要的信息：占位符和描述
      const result = items.map(item => ({
        placeholder: item.placeholder,
        description: item.description || '无描述',
        sensitive: item.sensitive || false
      }));
      
      return {
        success: true,
        items: result,
        count: result.length
      };
    } catch (error: any) {
      throw new Error(`获取密码信息失败: ${error.message}`);
    }
  }
};