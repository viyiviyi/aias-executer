# 使用Ubuntu 22.04作为基础镜像
FROM ubuntu:22.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    NODE_VERSION=22 \
    PYTHON_VERSION=3.11

# 设置时区
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 更换Ubuntu软件源为阿里云镜像
RUN sed -i 's/archive.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list

# 更新包管理器并安装基础工具
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    gnupg \
    ca-certificates \
    build-essential \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js 22 (使用NodeSource仓库)
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# 安装Yarn
RUN npm install -g yarn --registry=https://registry.npmmirror.com

# 配置npm和yarn使用阿里云镜像
RUN npm config set registry https://registry.npmmirror.com && \
    yarn config set registry https://registry.npmmirror.com

# 安装Python 3.11
RUN add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-dev python${PYTHON_VERSION}-distutils && \
    rm -rf /var/lib/apt/lists/*

# 安装pip并配置阿里云镜像
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python${PYTHON_VERSION} && \
    python${PYTHON_VERSION} -m pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    python${PYTHON_VERSION} -m pip config set global.trusted-host mirrors.aliyun.com

# 创建应用目录
WORKDIR /app

# 复制package.json和yarn.lock文件
COPY package.json yarn.lock ./

# 安装依赖（使用缓存优化）
RUN yarn install --frozen-lockfile --network-timeout 100000

# 复制项目文件
COPY . .

# 构建TypeScript项目
RUN yarn build

# 暴露端口（根据您的应用配置）
EXPOSE 23777

# 启动命令
CMD ["yarn", "start"]