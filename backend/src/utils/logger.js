const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')

// 创建logs目录路径
const logsDir = path.join(__dirname, '../../logs')

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`
    }
    return `${timestamp} [${level}]: ${message}`
  })
)

// 创建日志传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
]

// 生产环境添加文件输出
if (process.env.NODE_ENV === 'production') {
  // 错误日志
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: path.join(logsDir, 'error-audit.json'),
      handleExceptions: true,
      handleRejections: true
    })
  )

  // 组合日志
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '30d',
      auditFile: path.join(logsDir, 'combined-audit.json')
    })
  )
}

// 开发环境添加开发日志
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'development.log'),
      level: 'debug',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  )
}

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  exitOnError: false,
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
})

// HTTP请求日志流
logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  }
}

// 扩展方法
logger.request = (req, res, message = '') => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    message
  }
  logger.info('HTTP Request', logData)
}

logger.database = (query, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Database Query (${duration}ms): ${query}`)
  }
}

logger.security = (message, details = {}) => {
  logger.warn('Security Event', { message, ...details })
}

logger.performance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info'
  logger.log(level, `Performance: ${operation} took ${duration}ms`, details)
}

// 错误详情记录
logger.errorDetails = (error, context = {}) => {
  logger.error('Error Details', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}

module.exports = logger