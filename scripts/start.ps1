# 排班管理系统 PowerShell 启动脚本
# 用法: .\scripts\start.ps1

param(
    [switch]$Force,
    [switch]$NoWait
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 启动排班管理系统..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# 检查执行策略
$policy = Get-ExecutionPolicy
if ($policy -eq "Restricted") {
    Write-Host "❌ PowerShell执行策略限制" -ForegroundColor Red
    Write-Host "💡 请以管理员身份运行: Set-ExecutionPolicy RemoteSigned" -ForegroundColor Yellow
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

# 检查Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装Docker，请先安装Docker Desktop" -ForegroundColor Red
    Write-Host "📥 下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

# 检查Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装Docker Compose" -ForegroundColor Red
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

# 检查Docker是否运行
try {
    docker info | Out-Null
    Write-Host "✅ Docker服务正在运行" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: Docker服务未运行，请启动Docker Desktop" -ForegroundColor Red
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

# 检查项目文件
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ 错误: 请在项目根目录运行此脚本" -ForegroundColor Red
    Write-Host "💡 当前目录: $(Get-Location)" -ForegroundColor Yellow
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

if (-not (Test-Path ".env")) {
    Write-Host "❌ 错误: .env文件不存在，请先配置环境变量" -ForegroundColor Red
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

Write-Host "✅ 环境检查通过" -ForegroundColor Green

# 创建必要目录
Write-Host "📁 创建必要目录..." -ForegroundColor Yellow
@("uploads", "logs", "backend\logs", "frontend\dist") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "  创建: $_" -ForegroundColor Gray
    }
}

# 停止现有容器
Write-Host "🛑 停止现有容器..." -ForegroundColor Yellow
docker-compose down | Out-Null

# 启动服务
Write-Host "🔨 构建并启动服务..." -ForegroundColor Yellow
$startResult = docker-compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务启动失败，请检查错误信息" -ForegroundColor Red
    Write-Host "💡 尝试运行: docker-compose logs" -ForegroundColor Yellow
    if (-not $Force) {
        Read-Host "按回车键退出..."
        exit 1
    }
}

# 等待服务启动
if (-not $NoWait) {
    Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    # 检查服务状态
    Write-Host "🔍 检查服务状态..." -ForegroundColor Yellow
    docker-compose ps

    # 等待数据库
    Write-Host "⏳ 等待数据库初始化..." -ForegroundColor Yellow
    $attempts = 0
    $maxAttempts = 30
    do {
        $attempts++
        try {
            docker-compose exec -T mysql mysqladmin ping -h localhost -u root -proot123 --silent | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ 数据库已启动" -ForegroundColor Green
                break
            }
        } catch {}
        
        if ($attempts -ge $maxAttempts) {
            Write-Host "❌ 数据库启动超时" -ForegroundColor Red
            Write-Host "💡 查看数据库日志: docker-compose logs mysql" -ForegroundColor Yellow
            break
        }
        
        Write-Host "⏳ 等待数据库启动... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    } while ($true)

    # 检查后端服务
    Write-Host "🔍 检查后端服务..." -ForegroundColor Yellow
    $attempts = 0
    $maxAttempts = 20
    do {
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 1 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ 后端服务已启动" -ForegroundColor Green
                break
            }
        } catch {}
        
        if ($attempts -ge $maxAttempts) {
            Write-Host "⚠️ 后端服务启动可能有问题，请检查日志" -ForegroundColor Yellow
            Write-Host "💡 查看后端日志: docker-compose logs backend" -ForegroundColor Yellow
            break
        }
        
        Write-Host "⏳ 等待后端服务启动... ($attempts/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 3
    } while ($true)

    # 检查前端服务
    Write-Host "🔍 检查前端服务..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 前端服务已启动" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ 前端服务启动可能有问题，请检查日志" -ForegroundColor Yellow
        Write-Host "💡 查看前端日志: docker-compose logs frontend" -ForegroundColor Yellow
    }
}

# 显示信息
Write-Host ""
Write-Host "🎉 排班管理系统启动完成!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "📱 前端界面: http://localhost:3000" -ForegroundColor White
Write-Host "🔧 后端API:  http://localhost:5000" -ForegroundColor White
Write-Host "🗄️ 数据库:   http://localhost:8080 (phpMyAdmin)" -ForegroundColor White
Write-Host "📚 API文档:  http://localhost:5000/api-docs" -ForegroundColor White
Write-Host "🏥 健康检查: http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "💡 常用命令:" -ForegroundColor Yellow
Write-Host "  查看日志: docker-compose logs -f [service]" -ForegroundColor Gray
Write-Host "  停止服务: .\scripts\stop.ps1" -ForegroundColor Gray
Write-Host "  重启服务: docker-compose restart [service]" -ForegroundColor Gray
Write-Host "  进入容器: docker-compose exec [service] bash" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 演示账号:" -ForegroundColor Yellow
Write-Host "  管理员: admin@demo.com / admin123" -ForegroundColor Gray
Write-Host "  员工:   user@demo.com / user123" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 开发愉快!" -ForegroundColor Green

if (-not $NoWait) {
    Read-Host "按回车键退出..."
}