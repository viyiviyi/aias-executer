/**
 * 路径处理工具函数
 */

import path from 'path';
import fs from 'fs';
import { ConfigManager } from '../config';

const configManager = ConfigManager.getInstance();

/**
 * 验证并解析路径
 */
export function resolveAndValidatePath(
  filePath: string,
  mustExist: boolean = false
): string {
  return configManager.validatePath(filePath, mustExist);
}

/**
 * 检查路径是否在工作空间内
 */
export function isPathInWorkspace(filePath: string): boolean {
  try {
    const resolvedPath = path.resolve(configManager.getConfig().workspaceDir, filePath);
    const workspacePath = path.resolve(configManager.getConfig().workspaceDir);
    return resolvedPath.startsWith(workspacePath);
  } catch {
    return false;
  }
}

/**
 * 获取相对于工作空间的路径
 */
export function getRelativeToWorkspace(filePath: string): string {
  const workspaceDir = configManager.getConfig().workspaceDir;
  const resolvedPath = path.resolve(workspaceDir, filePath);
  return path.relative(workspaceDir, resolvedPath);
}

/**
 * 确保目录存在
 */
export function ensureDirectoryExists(dirPath: string): string {
  const resolvedPath = resolveAndValidatePath(dirPath, false);
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }
  return resolvedPath;
}

/**
 * 检查文件是否为文本文件
 */
export function isTextFile(filePath: string): boolean {
  return configManager.isTextFile(filePath);
}

/**
 * 检查文件扩展名是否允许
 */
export function isExtensionAllowed(filePath: string): boolean {
  return configManager.isExtensionAllowed(filePath);
}

/**
 * 获取安全的文件名（防止路径遍历）
 */
export function getSafeFileName(fileName: string): string {
  // 移除路径遍历字符
  let safeName = fileName.replace(/\.\./g, '');
  safeName = safeName.replace(/[\\/]/g, '_');
  
  // 移除控制字符
  safeName = safeName.replace(/[\x00-\x1F\x7F]/g, '');
  
  return safeName;
}

/**
 * 创建临时文件路径
 */
export function createTempFilePath(prefix: string = 'temp', extension: string = '.tmp'): string {
  const workspaceDir = configManager.getConfig().workspaceDir;
  const tempDir = path.join(workspaceDir, '.temp');
  ensureDirectoryExists(tempDir);
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const fileName = `${prefix}_${timestamp}_${random}${extension}`;
  
  return path.join(tempDir, getSafeFileName(fileName));
}

/**
 * 清理临时文件
 */
export function cleanupTempFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const workspaceDir = configManager.getConfig().workspaceDir;
  const tempDir = path.join(workspaceDir, '.temp');
  
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}