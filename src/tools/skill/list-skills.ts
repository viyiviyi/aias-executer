import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../../core/config';
import { Tool } from '@/types/tools/Tool';

const configManager = ConfigManager.getInstance();

interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  allowedTools?: string;
  disabled?: string;
  [key: string]: any; // 其他可能的元数据字段
}

interface SkillInfo {
  name: string;
  path: string;
  metadata: SkillMetadata;
  hasScripts: boolean;
  hasConfig: boolean;
  hasPackageJson: boolean;
  lastModified: string;
}

/**
 * 解析YAML frontmatter
 */
function parseYamlFrontmatter(content: string): SkillMetadata | null {
  try {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return null;
    }
    
    const yamlContent = match[1];
    const metadata: SkillMetadata = {
      name: '',
      description: ''
    };
    
    // 简单的YAML解析（只解析键值对）
    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim();
        let value = trimmedLine.substring(colonIndex + 1).trim();
        
        // 去除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        metadata[key] = value;
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('解析YAML frontmatter失败:', error);
    return null;
  }
}

/**
 * 检查目录是否存在并获取信息
 */
async function getSkillInfo(skillPath: string): Promise<SkillInfo | null> {
  try {
    const stat = await fs.stat(skillPath);
    
    // 检查是否是目录
    if (!stat.isDirectory()) {
      return null;
    }
    
    const skillName = path.basename(skillPath);
    
    // 检查是否有SKILL.md文件
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    let metadata: SkillMetadata = { name: skillName, description: '' };
    
    try {
      const skillMdContent = await fs.readFile(skillMdPath, 'utf-8');
      
      const parsedMetadata = parseYamlFrontmatter(skillMdContent);
      if (parsedMetadata) {
        metadata = { ...metadata, ...parsedMetadata };
      }
      
      // 如果没有解析到name，使用目录名
      if (!metadata.name || metadata.name.trim() === '') {
        metadata.name = skillName;
      }
    } catch (error) {
      // SKILL.md文件不存在或无法读取
      metadata.name = skillName;
      metadata.description = `Skill目录: ${skillName}`;
    }
    
    // 检查其他文件
    const scriptsPath = path.join(skillPath, 'scripts');
    const configPath = path.join(skillPath, 'config.json');
    const packageJsonPath = path.join(skillPath, 'package.json');
    
    let hasScripts = false;
    let hasConfig = false;
    let hasPackageJson = false;
    
    try {
      const scriptsStat = await fs.stat(scriptsPath);
      hasScripts = scriptsStat.isDirectory();
    } catch (error) {
      // scripts目录不存在
    }
    
    try {
      await fs.stat(configPath);
      hasConfig = true;
    } catch (error) {
      // config.json不存在
    }
    
    try {
      await fs.stat(packageJsonPath);
      hasPackageJson = true;
    } catch (error) {
      // package.json不存在
    }
    
    return {
      name: metadata.name,
      path: skillPath,
      metadata,
      hasScripts,
      hasConfig,
      hasPackageJson,
      lastModified: stat.mtime.toISOString()
    };
  } catch (error) {
    console.error(`获取skill信息失败 ${skillPath}:`, error);
    return null;
  }
}

export const listSkillsTool: Tool = {
  definition: {
    name: 'utils_list_skills',
    groupName: '技能工具',
    description: '扫描和获取所有可用的skill列表，包含元数据和路径信息',
    parameters: {
      type: 'object',
      properties: {
        skills_dir: {
          type: 'string',
          description: 'skills目录路径（相对于工作目录）',
          default: 'skills'
        },
        include_details: {
          type: 'boolean',
          description: '是否包含详细文件信息（scripts、config等）',
          default: true
        },
        filter_enabled: {
          type: 'boolean',
          description: '是否过滤掉disabled的skill（根据metadata.disabled字段）',
          default: true
        }
      },
      required: []
    }
  },
  
  execute: async (parameters: Record<string, any>) => {
    try {
      // 直接提取参数，不需要验证，因为所有参数都有默认值
      const {
        skills_dir = 'skills',
        include_details = true,
        filter_enabled = true
      } = parameters;
      
      const workspacePath = configManager.validatePath('.');
      const skillsPath = path.join(workspacePath, skills_dir);
      
      // 检查skills目录是否存在
      try {
        await fs.access(skillsPath);
      } catch (error) {
        return {
          success: true,
          skills: [],
          count: 0,
          message: `skills目录不存在: ${skillsPath}`
        };
      }
      
      // 读取skills目录
      const items = await fs.readdir(skillsPath, { withFileTypes: true });
      const skillPromises = items
        .filter(item => item.isDirectory())
        .map(item => getSkillInfo(path.join(skillsPath, item.name)));
      
      const skillResults = await Promise.all(skillPromises);
      const skills = skillResults.filter((skill): skill is SkillInfo => skill !== null);
      
      // 过滤disabled的skill
      const filteredSkills = filter_enabled 
        ? skills.filter(skill => !skill.metadata.disabled || skill.metadata.disabled === 'false')
        : skills;
      
      // 如果不包含详细信息，简化输出
      const resultSkills = include_details 
        ? filteredSkills
        : filteredSkills.map(skill => ({
            name: skill.name,
            path: skill.path,
            description: skill.metadata.description || '',
            lastModified: skill.lastModified
          }));
      
      return {
        success: true,
        skills: resultSkills,
        count: resultSkills.length,
        skills_dir: skillsPath,
        scan_time: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '扫描skills失败',
        skills: [],
        count: 0
      };
    }
  }
};