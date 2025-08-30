# 后端开发环境Dockerfile
FROM node:20-alpine

# 设置 Alpine 软件源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置工作目录
WORKDIR /app

# 设置npm源为淘宝源
RUN npm config set registry https://registry.npmmirror.com

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 5000

# 启动开发服务器
CMD ["npm", "run", "dev"]