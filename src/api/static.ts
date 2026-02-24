import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const router = Router();

// 获取工作目录路径
const WORKSPACE_PATH = path.join(__dirname, '../../workspace');

// 静态文件服务中间件
router.get('/files/*', (req: Request, res: Response): void => {
  try {
    // 获取请求的文件路径
    const requestedPath = req.params[0];
    if (!requestedPath) {
      res.status(400).json({
        success: false,
        error: '文件路径不能为空'
      });
      return;
    }

    // 构建完整的文件路径
    const fullPath = path.join(WORKSPACE_PATH, requestedPath);
    
    // 安全检查：确保请求的路径在工作目录内
    const normalizedFullPath = path.normalize(fullPath);
    
    if (!normalizedFullPath.startsWith(WORKSPACE_PATH)) {
      res.status(403).json({
        success: false,
        error: '禁止访问工作目录外的文件'
      });
      return;
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({
        success: false,
        error: '文件不存在'
      });
      return;
    }

    // 检查是否是文件（不是目录）
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      res.status(400).json({
        success: false,
        error: '请求的路径不是文件'
      });
      return;
    }

    // 设置正确的Content-Type
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // 设置缓存控制头
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    
    // 设置文件名（用于下载）
    const filename = path.basename(fullPath);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    // 创建可读流并传输文件
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    // 处理流错误
    fileStream.on('error', (error) => {
      console.error('文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '读取文件时发生错误'
        });
      }
    });

  } catch (error: any) {
    console.error('静态文件服务错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
});

// 列出目录内容
router.get('/list/*', (req: Request, res: Response): void => {
  try {
    const requestedPath = req.params[0] || '';
    const fullPath = path.join(WORKSPACE_PATH, requestedPath);
    
    // 安全检查
    const normalizedFullPath = path.normalize(fullPath);
    if (!normalizedFullPath.startsWith(WORKSPACE_PATH)) {
      res.status(403).json({
        success: false,
        error: '禁止访问工作目录外的路径'
      });
      return;
    }

    // 检查路径是否存在
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({
        success: false,
        error: '路径不存在'
      });
      return;
    }

    // 检查是否是目录
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      res.status(400).json({
        success: false,
        error: '请求的路径不是目录'
      });
      return;
    }

    // 读取目录内容
    const items = fs.readdirSync(fullPath);
    const result = items.map(item => {
      const itemPath = path.join(fullPath, item);
      const itemStat = fs.statSync(itemPath);
      
      return {
        name: item,
        type: itemStat.isDirectory() ? 'directory' : 'file',
        size: itemStat.isFile() ? itemStat.size : 0,
        modified: itemStat.mtime.toISOString(),
        path: path.join(requestedPath, item).replace(/\\/g, '/')
      };
    });

    res.json({
      success: true,
      path: requestedPath || '/',
      items: result,
      count: result.length
    });

  } catch (error: any) {
    console.error('目录列表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
});

// 获取文件信息
router.get('/info/*', (req: Request, res: Response): void => {
  try {
    const requestedPath = req.params[0];
    if (!requestedPath) {
      res.status(400).json({
        success: false,
        error: '文件路径不能为空'
      });
      return;
    }

    const fullPath = path.join(WORKSPACE_PATH, requestedPath);
    
    // 安全检查
    const normalizedFullPath = path.normalize(fullPath);
    if (!normalizedFullPath.startsWith(WORKSPACE_PATH)) {
      res.status(403).json({
        success: false,
        error: '禁止访问工作目录外的文件'
      });
      return;
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({
        success: false,
        error: '文件不存在'
      });
      return;
    }

    const stat = fs.statSync(fullPath);
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    
    res.json({
      success: true,
      name: path.basename(fullPath),
      path: requestedPath,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
      modified: stat.mtime.toISOString(),
      created: stat.ctime.toISOString(),
      mimeType: mimeType,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile()
    });

  } catch (error: any) {
    console.error('文件信息错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
});

export default router;