@echo off
chcp 65001 >nul
echo 🚀 启动排班管理系统...
echo ==================================

REM 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装Docker，请先安装Docker Desktop
    echo 📥 下载地址: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

REM 检查Docker Compose是否安装
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装Docker Compose
    echo 💡 Docker Desktop通常包含Docker Compose
    echo.
    pause
    exit /b 1
)

REM 检查Docker是否正在运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker服务未运行，请启动Docker Desktop
    echo 💡 请在系统托盘中找到Docker图标并启动
    echo.
    pause
    exit /b 1
)

echo ✅ 环境检查通过

REM 检查是否在项目根目录
if not exist "docker-compose.yml" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 💡 当前目录: %cd%
    echo.
    pause
    exit /b 1
)

REM 检查.env文件
if not exist ".env" (
    echo ❌ 错误: .env文件不存在，请先配置环境变量
    echo.
    pause
    exit /b 1
)

REM 创建必要的目录
echo 📁 创建必要目录...
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "backend\logs" mkdir "backend\logs"
if not exist "frontend\dist" mkdir "frontend\dist"

REM 停止可能正在运行的容器
echo 🛑 停止现有容器...
docker-compose down >nul 2>&1

REM 构建并启动服务
echo 🔨 构建并启动服务...
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ❌ 服务启动失败，请检查错误信息
    echo 💡 尝试运行: docker-compose logs
    echo.
    pause
    exit /b 1
)

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 15 /nobreak >nul

REM 检查服务状态
echo 🔍 检查服务状态...
docker-compose ps

REM 等待数据库启动
echo ⏳ 等待数据库初始化...
set /a attempts=0
set /a max_attempts=30

:check_mysql
set /a attempts+=1
docker-compose exec -T mysql mysqladmin ping -h localhost -u root -proot123 --silent >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 数据库已启动
    goto mysql_ready
)

if %attempts% geq %max_attempts% (
    echo ❌ 数据库启动超时
    echo 💡 查看数据库日志: docker-compose logs mysql
    goto show_info
)

echo ⏳ 等待数据库启动... ^(%attempts%/%max_attempts%^)
timeout /t 2 /nobreak >nul
goto check_mysql

:mysql_ready
REM 检查后端服务
echo 🔍 检查后端服务...
set /a attempts=0
set /a max_attempts=20

:check_backend
set /a attempts+=1
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务已启动
    goto backend_ready
)

if %attempts% geq %max_attempts% (
    echo ⚠️ 后端服务启动可能有问题，请检查日志
    echo 💡 查看后端日志: docker-compose logs backend
    goto check_frontend
)

echo ⏳ 等待后端服务启动... ^(%attempts%/%max_attempts%^)
timeout /t 3 /nobreak >nul
goto check_backend

:backend_ready
:check_frontend
REM 检查前端服务
echo 🔍 检查前端服务...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 前端服务已启动
) else (
    echo ⚠️ 前端服务启动可能有问题，请检查日志
    echo 💡 查看前端日志: docker-compose logs frontend
)

:show_info
echo.
echo 🎉 排班管理系统启动完成!
echo ==================================
echo 📱 前端界面: http://localhost:3000
echo 🔧 后端API:  http://localhost:5000
echo 🗄️ 数据库:   http://localhost:8080 ^(phpMyAdmin^)
echo 📚 API文档:  http://localhost:5000/api-docs
echo 🏥 健康检查: http://localhost:5000/health
echo.
echo 💡 常用命令:
echo   查看日志: docker-compose logs -f [service]
echo   停止服务: scripts\stop.bat
echo   重启服务: docker-compose restart [service]
echo   进入容器: docker-compose exec [service] bash
echo.
echo 🔑 演示账号:
echo   管理员: admin@demo.com / admin123
echo   员工:   user@demo.com / user123
echo.
echo 🚀 开发愉快!
echo 按任意键退出...
pause >nul