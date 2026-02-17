# MCP快速安装指南

## 5分钟快速开始

### 1. 安装基础工具

```bash
# 安装Node.js（如果尚未安装）
# 访问：https://nodejs.org/

# 安装Python（如果尚未安装）
# 访问：https://www.python.org/

# 安装uv（Python包管理器，推荐）
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 安装核心MCP服务器

```bash
# 文件系统服务器（基础必备）
npm install -g @modelcontextprotocol/server-filesystem

# Git服务器
uvx install mcp-server-git

# 浏览器自动化服务器
npm install -g @modelcontextprotocol/server-browser
```

### 3. 配置Claude Desktop

创建或编辑配置文件：

**macOS/Linux:**
```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

添加以下配置：
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/Documents"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"]
    },
    "browser": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-browser"]
    }
  }
}
```

### 4. 重启Claude Desktop
重启应用使配置生效。

## 必备MCP服务器分类安装

### 开发工具类

```bash
# GitHub集成
npm install -g @modelcontextprotocol/server-github

# Docker管理
git clone https://github.com/ckreiling/mcp-server-docker.git
cd mcp-server-docker && npm install

# PostgreSQL数据库
uvx install mcp-server-postgres

# MySQL数据库
npm install -g mcp-server-mysql
```

### 云服务类

```bash
# AWS工具
git clone https://github.com/awslabs/mcp.git

# Google Cloud
git clone https://github.com/GoogleCloudPlatform/cloud-run-mcp.git

# Azure
git clone https://github.com/microsoft/mcp.git
```

### AI/ML工具类

```bash
# Hugging Face
# 通过网页配置：https://huggingface.co/settings/mcp

# OpenAI集成
git clone https://github.com/SureScaleAI/openai-gpt-image-mcp.git
cd openai-gpt-image-mcp && pip install -r requirements.txt
```

## 配置示例大全

### 完整开发环境配置

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/Projects"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "~/Projects/my-project"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    },
    "postgres": {
      "command": "uvx",
      "args": ["mcp-server-postgres", "postgresql://localhost:5432/devdb"]
    },
    "docker": {
      "command": "node",
      "args": ["/path/to/mcp-server-docker/dist/index.js"]
    }
  }
}
```

### 数据科学配置

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/DataScience"]
    },
    "postgres": {
      "command": "uvx",
      "args": ["mcp-server-postgres", "postgresql://localhost:5432/datadb"]
    },
    "huggingface": {
      "command": "node",
      "args": ["/path/to/mcp-hfspace/dist/index.js"],
      "env": {
        "HF_TOKEN": "your_hf_token"
      }
    },
    "openai": {
      "command": "python",
      "args": ["/path/to/openai-mcp/server.py"],
      "env": {
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

## 故障排除快速指南

### 问题1：MCP服务器无法启动
```bash
# 检查命令是否存在
which npx
which uvx

# 测试直接运行
npx -y @modelcontextprotocol/server-filesystem --help
```

### 问题2：权限错误
```bash
# 检查文件权限
ls -la ~/Library/Application\ Support/Claude/

# 确保配置文件可读
chmod 644 ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 问题3：配置无效
```bash
# 验证JSON格式
python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 或使用jq
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

## 常用命令速查

```bash
# 安装MCP服务器
npm install -g @modelcontextprotocol/server-<name>
uvx install mcp-server-<name>
pip install mcp-server-<name>

# 运行测试
npx -y @modelcontextprotocol/server-<name> --help
uvx mcp-server-<name> --help

# 更新所有
npm update -g @modelcontextprotocol/server-*
uvx upgrade mcp-server-<name>

# 列出已安装
npm list -g --depth=0 | grep @modelcontextprotocol
```

## 安全注意事项

1. **API令牌安全**
   - 使用环境变量，不要硬编码
   - 定期轮换令牌
   - 使用最小权限原则

2. **文件系统访问**
   - 限制访问特定目录
   - 不要授予根目录访问权限
   - 定期审查访问日志

3. **网络访问**
   - 使用本地服务器时优先
   - 远程服务器需要HTTPS
   - 验证服务器来源

## 进阶资源

- [MCP官方文档](https://modelcontextprotocol.io)
- [GitHub仓库](https://github.com/modelcontextprotocol)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [MCP Servers目录](https://mcpservers.org)

## 更新日志

- **v1.0** (2024-01): 初始版本
- **v1.1** (2024-03): 添加故障排除和配置示例
- **v1.2** (2024-06): 更新服务器列表和安装命令

---

**提示**: 开始使用MCP时，建议从一个简单的配置开始，逐步添加更多服务器。定期检查MCP服务器的更新和安全公告。