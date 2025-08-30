const { Sequelize } = require('sequelize')
const logger = require('../utils/logger')

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'schedule_system',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root123',
  dialect: 'mysql',
  timezone: '+08:00',
  
  // 连接池配置
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // 日志配置
  logging: process.env.NODE_ENV === 'development' ? 
    (msg) => logger.debug(msg) : false,
    
  // 查询配置
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    underscored: true,
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 禁用时区转换，直接使用数据库原始时间
    timezone: false
  },
  
  // 重试配置
  retry: {
    max: 3,
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /ER_LOCK_WAIT_TIMEOUT/
    ]
  }
}

// 创建Sequelize实例
const sequelize = new Sequelize(config)

// 测试连接函数
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    logger.info('Database connection has been established successfully')
    return true
  } catch (error) {
    logger.error('Unable to connect to the database:', error)
    return false
  }
}

// 关闭连接函数
const closeConnection = async () => {
  try {
    await sequelize.close()
    logger.info('Database connection closed')
  } catch (error) {
    logger.error('Error closing database connection:', error)
  }
}

// 数据库同步函数
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options)
    logger.info('Database synchronized successfully')
  } catch (error) {
    logger.error('Database sync failed:', error)
    throw error
  }
}

// 检查表结构并自动迁移
const checkAndMigrate = async () => {
  try {
    // 只在开发环境执行
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    logger.info('Checking database schema...')
    
    // 检查 availability 表是否有新字段
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${config.database}' 
      AND TABLE_NAME = 'availability'
    `)
    
    const existingColumns = results.map(row => row.COLUMN_NAME)
    const requiredColumns = ['start_week_date', 'end_week_date', 'applies_to_weeks', 'template_id']
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.length > 0) {
      logger.info(`Missing columns detected: ${missingColumns.join(', ')}`)
      logger.info('Running auto migration...')
      
      // 执行迁移
      const migration = require('../migrations/001-update-availability-table')
      await migration.up(sequelize)
      
      logger.info('Auto migration completed')
    } else {
      logger.info('Database schema is up to date')
    }
    
  } catch (error) {
    logger.warn('Auto migration check failed:', error.message)
    // 不抛出错误，让应用继续启动
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  closeConnection,
  syncDatabase,
  checkAndMigrate
}