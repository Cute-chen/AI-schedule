#!/bin/bash

# 排班管理系统停止脚本
# 用于停止所有服务

echo "🛑 停止排班管理系统..."
echo "=================================="

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 显示当前运行的容器
echo "📋 当前运行的容器:"
docker-compose ps

echo ""
echo "🛑 正在停止所有服务..."

# 停止并移除容器
docker-compose down

# 检查是否有参数指定清理数据
if [ "$1" == "--clean" ]; then
    echo "🧹 清理数据卷..."
    docker-compose down -v
    
    echo "🗑️  删除未使用的镜像..."
    docker image prune -f
    
    echo "🧹 清理构建缓存..."
    docker builder prune -f
fi

# 检查是否有参数指定清理所有内容
if [ "$1" == "--clean-all" ]; then
    echo "🧹 清理所有内容..."
    docker-compose down -v --remove-orphans
    
    echo "🗑️  删除项目相关镜像..."
    docker images | grep schedule-system | awk '{print $3}' | xargs -r docker rmi -f
    
    echo "🗑️  删除未使用的镜像..."
    docker image prune -a -f
    
    echo "🧹 清理网络..."
    docker network prune -f
    
    echo "🧹 清理构建缓存..."
    docker builder prune -f
fi

# 验证停止状态
echo ""
echo "🔍 验证停止状态:"
containers=$(docker-compose ps -q)

if [ -z "$containers" ]; then
    echo "✅ 所有服务已成功停止"
else
    echo "⚠️  以下容器仍在运行:"
    docker-compose ps
fi

echo ""
echo "📋 使用说明:"
echo "  常规停止:     ./scripts/stop.sh"
echo "  清理数据卷:   ./scripts/stop.sh --clean"
echo "  清理所有内容: ./scripts/stop.sh --clean-all"
echo ""
echo "✅ 停止完成!"