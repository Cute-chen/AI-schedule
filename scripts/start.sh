#!/bin/bash

# 排班管理系统启动脚本
# 用于快速启动开发环境

echo "🚀 启动排班管理系统..."
echo "=================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装Docker，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未安装Docker Compose，请先安装Docker Compose"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env文件不存在，请先配置环境变量"
    exit 1
fi

echo "✅ 环境检查通过"

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p uploads
mkdir -p logs
mkdir -p backend/logs
mkdir -p frontend/dist

# 停止可能正在运行的容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 等待数据库完全启动
echo "⏳ 等待数据库初始化..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p$DB_PASS --silent; then
        echo "✅ 数据库已启动"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "⏳ 等待数据库启动... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ 数据库启动超时"
    docker-compose logs mysql
    exit 1
fi

# 检查后端服务健康状态
echo "🔍 检查后端服务..."
max_attempts=20
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:5000/health > /dev/null; then
        echo "✅ 后端服务已启动"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "⏳ 等待后端服务启动... ($attempt/$max_attempts)"
    sleep 3
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  后端服务启动可能有问题，请检查日志"
    docker-compose logs backend
fi

# 检查前端服务
echo "🔍 检查前端服务..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服务已启动"
else
    echo "⚠️  前端服务启动可能有问题，请检查日志"
    docker-compose logs frontend
fi

echo ""
echo "🎉 排班管理系统启动完成!"
echo "=================================="
echo "📱 前端界面: http://localhost:3000"
echo "🔧 后端API:  http://localhost:5000"
echo "🗄️  数据库:   http://localhost:8080 (phpMyAdmin)"
echo "📚 API文档:  http://localhost:5000/api-docs"
echo "🏥 健康检查: http://localhost:5000/health"
echo ""
echo "💡 常用命令:"
echo "  查看日志: docker-compose logs -f [service]"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart [service]"
echo "  进入容器: docker-compose exec [service] bash"
echo ""
echo "🚀 开发愉快!"