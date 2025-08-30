@echo off
chcp 65001 >nul
echo 🛑 停止排班管理系统...
echo ==================================

REM 检查是否在项目根目录
if not exist "docker-compose.yml" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 💡 当前目录: %cd%
    echo.
    pause
    exit /b 1
)

REM 显示当前运行的容器
echo 📋 当前运行的容器:
docker-compose ps

echo.
echo 🛑 正在停止所有服务...

REM 停止并移除容器
docker-compose down

if %errorlevel% neq 0 (
    echo ❌ 停止服务时出现错误
    echo.
    pause
    exit /b 1
)

REM 检查参数
if "%1"=="--clean" (
    echo 🧹 清理数据卷...
    docker-compose down -v
    
    echo 🗑️ 删除未使用的镜像...
    docker image prune -f
    
    echo 🧹 清理构建缓存...
    docker builder prune -f
    
    goto verify_stop
)

if "%1"=="--clean-all" (
    echo 🧹 清理所有内容...
    docker-compose down -v --remove-orphans
    
    echo 🗑️ 删除项目相关镜像...
    for /f "tokens=3" %%i in ('docker images ^| findstr "schedule-system"') do docker rmi -f %%i 2>nul
    
    echo 🗑️ 删除未使用的镜像...
    docker image prune -a -f
    
    echo 🧹 清理网络...
    docker network prune -f
    
    echo 🧹 清理构建缓存...
    docker builder prune -f
    
    goto verify_stop
)

:verify_stop
REM 验证停止状态
echo.
echo 🔍 验证停止状态:

REM 获取容器数量
for /f %%i in ('docker-compose ps -q 2^>nul ^| find /c /v ""') do set container_count=%%i

if %container_count%==0 (
    echo ✅ 所有服务已成功停止
) else (
    echo ⚠️ 以下容器仍在运行:
    docker-compose ps
)

echo.
echo 📋 使用说明:
echo   常规停止:     scripts\stop.bat
echo   清理数据卷:   scripts\stop.bat --clean
echo   清理所有内容: scripts\stop.bat --clean-all
echo.
echo ✅ 停止完成!
echo 按任意键退出...
pause >nul