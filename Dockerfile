# 使用Ubuntu 22.04作为基础镜像
FROM ubuntu:22.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    NODE_VERSION=22 \
    PYTHON_VERSION=3.11 \
    PACKAGE_MANAGER=yarn

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

# 安装Playwright浏览器依赖
RUN apt-get update && apt-get install -y \
    libxcb-shm0 \
    libx11-xcb1 \
    libxrandr2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libgtk-3-0 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libxrender1 \
    libasound2 \
    libnspr4 \
    libnss3 \
    libgbm1 \
    libxshmfence1 \
    libdrm2 \
    libxkbcommon0 \
    libatk-bridge2.0-0 \
    libx11-6 \
    libxext6 \
    libwayland-client0 \
    libwayland-cursor0 \
    libwayland-egl1 \
    libwayland-server0 \
    libwebp7 \
    libxcb1 \
    libxcb-render0 \
    libxcb-shm0 \
    libxcb-xfixes0 \
    libharfbuzz0b \
    libfreetype6 \
    libfontconfig1 \
    libexpat1 \
    libdbus-1-3 \
    libcups2 \
    libatspi2.0-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libpixman-1-0 \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

# 安装FileBrowser文件浏览器
RUN curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | bash

# 创建应用目录
WORKDIR /app

# 复制package.json和yarn.lock文件
COPY package.json yarn.lock ./

# 使用yarn安装所有依赖（包括devDependencies，因为开发版本需要）
RUN yarn install --frozen-lockfile --network-timeout 100000

# 安装Playwright
RUN npx playwright install --with-deps chromium

# 复制项目文件
COPY . .

# 使用yarn构建TypeScript项目
RUN yarn build

# 复制启动脚本
COPY start-all.sh /app/start-all.sh
RUN chmod +x /app/start-all.sh

# 暴露端口
EXPOSE 23777 23769 8080

# 启动所有服务
CMD ["/app/start-all.sh"]
