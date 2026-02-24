# 静态文件服务测试文档

## 功能验证

### 1. 文件访问
- URL: `http://localhost:23777/api/static/files/static-file-test.md`
- 外链格式: `{{execution_url}}/api/static/files/static-file-test.md`

### 2. 目录列表
- 根目录: `http://localhost:23777/api/static/list/`
- 子目录: `http://localhost:23777/api/static/list/autostart`

### 3. 文件信息
- 文件信息: `http://localhost:23777/api/static/info/static-file-test.md`

## 使用示例

### 外链生成
假设执行器运行在 `http://192.168.1.100:23777`：

1. **原始URL**: `http://192.168.1.100:23777/api/static/files/report.pdf`
2. **外链格式**: `{{execution_url}}/api/static/files/report.pdf`
3. **系统处理**: 自动替换 `{{execution_url}}` 为实际URL

### 代码示例
```javascript
// 获取文件
fetch('{{execution_url}}/api/static/files/document.txt')
  .then(response => response.text())
  .then(data => console.log(data));

// 列出目录
fetch('{{execution_url}}/api/static/list/')
  .then(response => response.json())
  .then(data => console.log(data.items));

// 获取文件信息
fetch('{{execution_url}}/api/static/info/image.jpg')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 安全特性

1. **路径限制**: 只能访问工作目录内的文件
2. **目录遍历防护**: 防止 `../` 等路径遍历攻击
3. **文件类型检查**: 确保请求的是文件而不是目录
4. **MIME类型识别**: 自动设置正确的Content-Type
5. **缓存控制**: 文件缓存1小时

## 响应格式

### 成功响应
- 文件访问: 直接返回文件内容
- 目录列表: JSON格式的目录内容
- 文件信息: JSON格式的文件元数据

### 错误响应
```json
{
  "success": false,
  "error": "错误描述"
}
```

## 测试状态
✅ 所有功能测试通过
✅ 安全限制生效
✅ 外链格式支持
✅ 错误处理正常