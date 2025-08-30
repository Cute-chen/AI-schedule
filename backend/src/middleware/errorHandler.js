const logger = require('../utils/logger')

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// 异步错误捕获包装器
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// 处理Sequelize验证错误
const handleSequelizeValidationError = (error) => {
  const errors = error.errors.map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }))
  
  return new AppError(`Validation failed: ${errors.map(e => e.message).join(', ')}`, 400)
}

// 处理Sequelize唯一约束错误
const handleSequelizeUniqueConstraintError = (error) => {
  const field = error.errors[0].path
  return new AppError(`${field} already exists`, 409)
}

// 处理Sequelize外键约束错误
const handleSequelizeForeignKeyConstraintError = (error) => {
  return new AppError('Referenced record does not exist', 400)
}

// 处理JWT错误
const handleJWTError = () => {
  return new AppError('Invalid token, please log in again', 401)
}

const handleJWTExpiredError = () => {
  return new AppError('Token expired, please log in again', 401)
}

// 发送开发环境错误
const sendErrorDev = (err, req, res) => {
  logger.errorDetails(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
}

// 发送生产环境错误
const sendErrorProd = (err, req, res) => {
  // 记录所有错误
  logger.errorDetails(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // 操作性错误：发送给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  } else {
    // 编程错误：不泄露详情
    logger.error('Programming Error!', err)
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    })
  }
}

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res)
  } else {
    let error = { ...err }
    error.message = err.message

    // 处理特定错误类型
    if (err.name === 'SequelizeValidationError') {
      error = handleSequelizeValidationError(error)
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      error = handleSequelizeUniqueConstraintError(error)
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      error = handleSequelizeForeignKeyConstraintError(error)
    } else if (err.name === 'JsonWebTokenError') {
      error = handleJWTError()
    } else if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError()
    } else if (err.code === 'EBADCSRFTOKEN') {
      error = new AppError('Invalid CSRF token', 403)
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File too large', 413)
    } else if (err.code === 'ENOTFOUND') {
      error = new AppError('Service unavailable', 503)
    }

    sendErrorProd(error, req, res)
  }
}

// 404错误处理
const notFound = (req, res, next) => {
  const message = `Can't find ${req.originalUrl} on this server!`
  next(new AppError(message, 404))
}

// 验证错误处理
const validationError = (errors) => {
  const formattedErrors = errors.map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }))
  
  return new AppError(
    `Validation failed: ${formattedErrors.map(e => e.message).join(', ')}`,
    422
  )
}

// 权限错误
const permissionDenied = (message = 'Permission denied') => {
  return new AppError(message, 403)
}

// 资源未找到错误
const notFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404)
}

// 冲突错误
const conflictError = (message = 'Conflict occurred') => {
  return new AppError(message, 409)
}

// 速率限制错误
const rateLimitError = (message = 'Too many requests') => {
  return new AppError(message, 429)
}

module.exports = {
  AppError,
  catchAsync,
  errorHandler,
  notFound,
  validationError,
  permissionDenied,
  notFoundError,
  conflictError,
  rateLimitError
}