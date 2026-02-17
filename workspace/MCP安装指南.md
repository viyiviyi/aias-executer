# MCP (Model Context Protocol) 安装指南

## 概述

Model Context Protocol (MCP) 是一个开放协议，允许AI助手安全地访问外部工具和数据源。本指南将帮助您了解如何安装和配置MCP服务器。

## 目录

1. [MCP简介](#mcp简介)
2. [必备MCP服务器列表](#必备mcp服务器列表)
3. [安装准备](#安装准备)
4. [基础MCP服务器安装](#基础mcp服务器安装)
5. [开发工具类MCP](#开发工具类mcp)
6. [数据库类MCP](#数据库类mcp)
7. [云服务类MCP](#云服务类mcp)
8. [AI/ML工具类MCP](#aiml工具类mcp)
9. [配置MCP客户端](#配置mcp客户端)
10. [故障排除](#故障排除)

## MCP简介

MCP (Model Context Protocol) 是由Anthropic开发的开放协议，它允许AI助手（如Claude、Cursor等）通过标准化的接口安全地访问外部工具和数据源。MCP的主要优势包括：

- **安全性**：通过沙箱和权限控制保护用户数据
- **标准化**：统一的接口规范
- **可扩展性**：可以轻松添加新的工具和数据源
- **社区驱动**：丰富的第三方服务器生态系统

## 必备MCP服务器列表

以下是按类别分类的必备MCP服务器推荐：

### 核心工具类
1. **文件系统** (`@modelcontextprotocol/server-filesystem`)
   - 安全的文件操作和访问控制
   - 基础的文件读写能力

2. **Git** (`@modelcontextprotocol/server-git`)
   - Git仓库管理和操作
   - 代码版本控制工具

3. **浏览器自动化** (`@modelcontextprotocol/server-browser`)
   - 网页浏览和数据提取
   - Playwright集成

### 开发工具类
4. **GitHub** (`github/github-mcp-server`)
   - GitHub API集成
   - 仓库、Issue、PR管理

5. **Docker** (`ckreiling/mcp-server-docker`)
   - 容器管理和操作
   - 开发环境管理

6. **Kubernetes** (`Flux159/mcp-server-kubernetes`)
   - K8s集群管理
   - 容器编排工具

### 数据库类
7. **PostgreSQL** (`ahmedmustahid/postgres-mcp-server`)
   - PostgreSQL数据库操作
   - SQL查询和执行

8. **MySQL** (`benborla/mcp-server-mysql`)
   - MySQL数据库集成
   - 数据库管理工具

9. **MongoDB** (`mongodb-js/mongodb-mcp-server`)
   - MongoDB数据库操作
   - NoSQL数据库支持

### 云服务类
10. **AWS** (`awslabs/mcp`)
    - AWS云服务管理
    - 多种AWS服务集成

11. **Google Cloud** (`GoogleCloudPlatform/cloud-run-mcp`)
    - Google Cloud服务
    - Cloud Run部署

12. **Azure** (`microsoft/mcp`)
    - Microsoft Azure服务
    - 多种Azure工具

### AI/ML工具类
13. **Hugging Face** (官方MCP)
    - 模型和数据集访问
    - AI模型集成

14. **OpenAI** (`SureScaleAI/openai-gpt-image-mcp`)
    - OpenAI API集成
    - GPT和图像生成

## 安装准备

在开始安装MCP服务器之前，请确保您的系统满足以下要求：

### 系统要求
- **Node.js** (v16或更高版本) - 用于JavaScript/TypeScript服务器
- **Python** (v3.8或更高版本) - 用于Python服务器
- **npm** 或 **yarn** - Node.js包管理器
- **pip** 或 **uv** - Python包管理器
- **Git** - 版本控制系统

### 环境检查
```bash
# 检查Node.js版本
node --version

# 检查Python版本
python --version

# 检查npm版本
npm --version

# 检查Git版本
git --version
```

## 基础MCP服务器安装

### 1. 文件系统MCP服务器

**安装方法：**
```bash
# 使用npx直接运行
npx -y @modelcontextprotocol/server-filesystem

# 或全局安装
npm install -g @modelcontextprotocol/server-filesystem
```

**配置示例：**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    }
  }
}
```

### 2. Git MCP服务器

**安装方法：**
```bash
# 使用uvx（推荐）
uvx mcp-server-git

# 或使用pip
pip install mcp-server-git
```

**配置示例：**
```json
{
  "mcpServers": {
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "path/to/git/repo"]
    }
  }
}
```

### 3. 浏览器自动化MCP服务器

**安装方法：**
```bash
# 安装Playwright浏览器服务器
npx -y @modelcontextprotocol/server-playwright

# 或基础浏览器服务器
npx -y @modelcontextprotocol/server-browser
```

**配置示例：**
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-browser"]
    }
  }
}
```

## 开发工具类MCP

### 4. GitHub MCP服务器

**安装方法：**
```bash
# 克隆GitHub官方MCP服务器
git clone https://github.com/github/github-mcp-server.git
cd github-mcp-server
npm install
npm run build

# 或使用npx
npx -y @modelcontextprotocol/server-github
```

**配置示例：**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

### 5. Docker MCP服务器

**安装方法：**
```bash
# 克隆Docker MCP服务器
git clone https://github.com/ckreiling/mcp-server-docker.git
cd mcp-server-docker
npm install

# 或使用npx（如果发布到npm）
npx -y mcp-server-docker
```

**配置示例：**
```json
{
  "mcpServers": {
    "docker": {
      "command": "node",
      "args": ["/path/to/mcp-server-docker/dist/index.js"]
    }
  }
}
```

### 6. Kubernetes MCP服务器

**安装方法：**
```bash
# 克隆Kubernetes MCP服务器
git clone https://github.com/Flux159/mcp-server-kubernetes.git
cd mcp-server-kubernetes
npm install
npm run build
```

**配置示例：**
```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "node",
      "args": ["/path/to/mcp-server-kubernetes/dist/index.js"],
      "env": {
        "KUBECONFIG": "/path/to/kubeconfig"
      }
    }
  }
}
```

## 数据库类MCP

### 7. PostgreSQL MCP服务器

**安装方法：**
```bash
# 使用pip安装
pip install mcp-server-postgres

# 或使用uvx
uvx mcp-server-postgres
```

**配置示例：**
```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["mcp-server-postgres", "postgresql://user:password@localhost/dbname"]
    }
  }
}
```

### 8. MySQL MCP服务器

**安装方法：**
```bash
# 使用npm安装
npm install -g mcp-server-mysql

# 或从源码安装
git clone https://github.com/benborla/mcp-server-mysql.git
cd mcp-server-mysql
npm install
npm run build
```

**配置示例：**
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/path/to/mcp-server-mysql/dist/index.js", "mysql://user:password@localhost/dbname"]
    }
  }
}
```

### 9. MongoDB MCP服务器

**安装方法：**
```bash
# 使用npm安装官方MongoDB MCP
npm install -g @mongodb/mcp-server-mongodb

# 或从源码安装
git clone https://github.com/mongodb-js/mongodb-mcp-server.git
cd mongodb-mcp-server
npm install
npm run build
```

**配置示例：**
```json
{
  "mcpServers": {
    "mongodb": {
      "command": "node",
      "args": ["/path/to/mongodb-mcp-server/dist/index.js", "mongodb://localhost:27017/dbname"]
    }
  }
}
```

## 云服务类MCP

### 10. AWS MCP服务器

**安装方法：**
```bash
# 克隆AWS MCP服务器
git clone https://github.com/awslabs/mcp.git
cd mcp

# 安装依赖（根据具体服务器）
# 每个AWS服务可能有独立的MCP服务器
```

**配置示例：**
```json
{
  "mcpServers": {
    "aws-s3": {
      "command": "python",
      "args": ["/path/to/aws-mcp/s3_server.py"],
      "env": {
        "AWS_ACCESS_KEY_ID": "<YOUR_KEY>",
        "AWS_SECRET_ACCESS_KEY": "<YOUR_SECRET>",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

### 11. Google Cloud MCP服务器

**安装方法：**
```bash
# 克隆Google Cloud MCP服务器
git clone https://github.com/GoogleCloudPlatform/cloud-run-mcp.git
cd cloud-run-mcp
npm install
```

**配置示例：**
```json
{
  "mcpServers": {
    "gcloud": {
      "command": "node",
      "args": ["/path/to/cloud-run-mcp/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/credentials.json"
      }
    }
  }
}
```

### 12. Azure MCP服务器

**安装方法：**
```bash
# 克隆Azure MCP服务器
git clone https://github.com/microsoft/mcp.git
cd mcp/servers/Azure.Mcp.Server

# 根据具体服务器安装依赖
# 可能是.NET、Python或Node.js项目
```

**配置示例：**
```json
{
  "mcpServers": {
    "azure": {
      "command": "dotnet",
      "args": ["run", "--project", "/path/to/azure-mcp-server"],
      "env": {
        "AZURE_CLIENT_ID": "<CLIENT_ID>",
        "AZURE_TENANT_ID": "<TENANT_ID>",
        "AZURE_CLIENT_SECRET": "<CLIENT_SECRET>"
      }
    }
  }
}
```

## AI/ML工具类MCP

### 13. Hugging Face MCP

**安装方法：**
```bash
# Hugging Face官方MCP通过设置页面配置
# 访问：https://huggingface.co/settings/mcp

# 或使用社区实现
git clone https://github.com/evalstate/mcp-hfspace.git
cd mcp-hfspace
npm install
```

**配置示例：**
```json
{
  "mcpServers": {
    "huggingface": {
      "command": "node",
      "args": ["/path/to/mcp-hfspace/dist/index.js"],
      "env": {
        "HF_TOKEN": "<YOUR_HUGGINGFACE_TOKEN>"
      }
    }
  }
}
```

### 14. OpenAI MCP服务器

**安装方法：**
```bash
# 克隆OpenAI MCP服务器
git clone https://github.com/SureScaleAI/openai-gpt-image-mcp.git
cd openai-gpt-image-mcp
pip install -r requirements.txt
```

**配置示例：**
```json
{
  "mcpServers": {
    "openai": {
      "command": "python",
      "args": ["/path/to/openai-mcp/server.py"],
      "env": {
        "OPENAI_API_KEY": "<YOUR_OPENAI_API_KEY>"
      }
    }
  }
}
```

## 配置MCP客户端

### Claude Desktop配置

Claude Desktop是最常用的MCP客户端之一。配置文件通常位于：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**完整配置示例：**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Projects"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "/Users/username/Projects/my-repo"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    },
    "postgres": {
      "command": "uvx",
      "args": ["mcp-server-postgres", "postgresql://localhost:5432/mydb"]
    }
  }
}
```

### Cursor IDE配置

Cursor IDE也支持MCP。配置文件位于：
- `~/.cursor/mcp.json`

**配置示例：**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/projects"]
    },
    "docker": {
      "command": "node",
      "args": ["/path/to/mcp-server-docker/dist/index.js"]
    }
  }
}
```

### VS Code配置

通过扩展配置MCP：
1. 安装MCP相关扩展
2. 在设置中配置MCP服务器

## 故障排除

### 常见问题

1. **MCP服务器无法启动**
   - 检查命令路径是否正确
   - 确保依赖已安装
   - 查看日志输出

2. **权限问题**
   - 确保有执行权限
   - 检查文件系统访问权限
   - 验证API令牌和密钥

3. **连接问题**
   - 检查网络连接
   - 验证端口和URL
   - 查看防火墙设置

### 调试技巧

1. **启用详细日志**
   ```bash
   # 设置环境变量
   export DEBUG=mcp:*
   export NODE_DEBUG=mcp
   ```

2. **测试MCP服务器**
   ```bash
   # 直接运行服务器测试
   npx -y @modelcontextprotocol/server-filesystem --help
   
   # 使用MCP调试工具
   npx -y @modelcontextprotocol/mcp-inspector
   ```

3. **检查配置语法**
   - 使用JSON验证器检查配置文件
   - 确保JSON格式正确
   - 检查路径和参数

### 获取帮助

1. **官方资源**
   - [MCP官方文档](https://modelcontextprotocol.io)
   - [GitHub仓库](https://github.com/modelcontextprotocol)
   - [Discord社区](https://discord.gg/modelcontextprotocol)

2. **社区资源**
   - [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
   - [MCP Servers Hub](https://mcpservers.org)
   - [Reddit社区](https://www.reddit.com/r/mcp)

## 最佳实践

1. **安全性**
   - 使用环境变量存储敏感信息
   - 限制文件系统访问范围
   - 定期更新API令牌

2. **性能**
   - 只安装需要的MCP服务器
   - 使用轻量级实现
   - 合理配置资源限制

3. **维护**
   - 定期更新MCP服务器
   - 备份配置文件
   - 监控日志和性能

## 总结

MCP为AI助手提供了强大的扩展能力，通过安装合适的MCP服务器，您可以显著提升开发效率和工作流程。建议从基础的文件系统和Git服务器开始，然后根据需求逐步添加其他工具。

记住：安全第一，只安装信任的MCP服务器，并定期审查配置和权限设置。

---
*最后更新：2024年*
*参考资源：MCP官方文档、GitHub仓库、社区资源*