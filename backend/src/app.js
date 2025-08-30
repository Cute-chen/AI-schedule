const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const path = require('path')
const http = require('http')
require('dotenv').config()

// 导入配置和工具
const { sequelize, testConnection, checkAndMigrate } = require('./config/database')
const logger = require('./utils/logger')
const { errorHandler, notFound } = require('./middleware/errorHandler')

// 导入路由
const authRoutes = require('./routes/auth')
const employeeRoutes = require('./routes/employees')
const availabilityRoutes = require('./routes/availability')
const scheduleRoutes = require('./routes/schedules')
const aiScheduleRoutes = require('./routes/ai-schedule')
const shiftRequestRoutes = require('./routes/shiftRequests')
const statisticsRoutes = require('./routes/statistics')
const settingsRoutes = require('./routes/settings')

// 创建Express应用
const app = express()

// 设置信任代理
app.set('trust proxy', 1)

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

app.use(cors({
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean) // 过滤掉undefined值
    
    // 开发环境允许所有源，生产环境只允许指定源
    if (process.env.NODE_ENV === 'development') {
      // 开发环境允许所有源
      return callback(null, true)
    }
    
    // 生产环境检查源
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}))

app.use(compression())
app.use(cookieParser())

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))
}

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 开发环境更宽松
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api', limiter)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/ai-schedule', aiScheduleRoutes)
app.use('/api/shift-requests', shiftRequestRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/settings', settingsRoutes)

// API文档 (Swagger)
if (process.env.NODE_ENV === 'development') {
  const swaggerUi = require('swagger-ui-express')
  const swaggerSpec = require('./config/swagger')
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '排班管理系统 API 文档',
    customCss: '.swagger-ui .topbar { display: none }'
  }))
  
  // API规格JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}

// 404处理
app.use(notFound)

// 错误处理中间件
app.use(errorHandler)

// 数据库连接和应用启动
const PORT = process.env.PORT || 5001

const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate()
    logger.info('Database connection established successfully')
    
    // 检查并执行数据库迁移
    await checkAndMigrate()
    
    // 启动定时任务
    require('./services/cronService')
    
    // 创建HTTP服务器
    const server = http.createServer(app)
    
    
    // 启动服务器
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API Documentation: http://localhost:${PORT}/api-docs`)
        logger.info(`Health Check: http://localhost:${PORT}/health`)
      }
    })

    // 优雅关闭
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, starting graceful shutdown`)
      
      server.close(async () => {
        logger.info('HTTP server closed')
        
        try {
          await sequelize.close()
          logger.info('Database connection closed')
          process.exit(0)
        } catch (error) {
          logger.error('Error closing database connection:', error)
          process.exit(1)
        }
      })
      
      // 强制退出超时
      setTimeout(() => {
        logger.error('Forceful shutdown due to timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// 启动服务器
startServer()

module.exports = app