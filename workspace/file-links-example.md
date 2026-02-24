# 文件外链示例

## 已创建的文件外链

### 1. 文本文件外链
- **文件**: `test-file-for-link.txt`
- **外链**: `{{execution_url}}/api/static/files/test-file-for-link.txt`
- **描述**: 包含文件外链功能说明的文本文件

### 2. Markdown文件外链
- **文件**: `file-links-example.md` (当前文件)
- **外链**: `{{execution_url}}/api/static/files/file-links-example.md`
- **描述**: 文件外链使用说明文档

### 3. 现有文件外链示例
- **文件**: `static-file-test.md`
- **外链**: `{{execution_url}}/api/static/files/static-file-test.md`
- **描述**: 之前创建的静态文件测试文档

## 如何使用文件外链

### 基本格式
```
{{execution_url}}/api/static/files/文件名
```

### 示例
1. **直接访问文件**:
   ```
   {{execution_url}}/api/static/files/test-file.txt
   ```

2. **查看目录列表**:
   ```
   {{execution_url}}/api/static/list/
   ```

3. **获取文件信息**:
   ```
   {{execution_url}}/api/static/info/test-file.txt
   ```

## 支持的文件类型

系统支持多种文件类型，包括但不限于：
- 文本文件 (.txt, .md, .json, .xml, .html, .css, .js)
- 图片文件 (.jpg, .png, .gif, .svg)
- 文档文件 (.pdf, .docx, .xlsx, .pptx)
- 压缩文件 (.zip, .tar.gz)
- 音频视频文件 (.mp3, .mp4, .avi)

## 注意事项

1. 只能访问工作目录（workspace）内的文件
2. 文件缓存时间为1小时
3. 外链中的 `{{execution_url}}` 会自动替换为实际的执行器URL
4. 文件大小限制取决于服务器配置

## 测试建议

您可以尝试：
1. 使用外链访问上面列出的文件
2. 创建新文件并生成外链
3. 测试不同文件类型的访问
4. 验证目录列表功能

---
*最后更新: 2026-02-24*