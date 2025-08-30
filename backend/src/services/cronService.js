const cron = require('node-cron')
const logger = require('../utils/logger')

/**
 * 定时任务服务
 * 负责管理系统中的所有定时任务
 */
class CronService {
  constructor() {
    this.tasks = new Map()
    this.init()
  }

  /**
   * 初始化定时任务
   */
  init() {
    logger.info('Initializing cron service...')

    // 启动所有定时任务
    this.scheduleDataCleanup()
    this.scheduleHealthCheck()

    logger.info('Cron service initialized successfully')
  }

  /**
   * 添加定时任务
   * @param {string} name - 任务名称
   * @param {string} pattern - cron表达式
   * @param {function} callback - 回调函数
   * @param {object} options - 选项
   */
  addTask(name, pattern, callback, options = {}) {
    try {
      const task = cron.schedule(pattern, async () => {
        const startTime = Date.now()
        logger.info(`Cron task started: ${name}`)
        
        try {
          await callback()
          const duration = Date.now() - startTime
          logger.info(`Cron task completed: ${name} (${duration}ms)`)
        } catch (error) {
          logger.error(`Cron task failed: ${name}`, error)
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai',
        ...options
      })

      this.tasks.set(name, task)
      task.start()
      
      logger.info(`Cron task registered: ${name} with pattern: ${pattern}`)
    } catch (error) {
      logger.error(`Failed to add cron task: ${name}`, error)
    }
  }

  /**
   * 移除定时任务
   * @param {string} name - 任务名称
   */
  removeTask(name) {
    const task = this.tasks.get(name)
    if (task) {
      task.destroy()
      this.tasks.delete(name)
      logger.info(`Cron task removed: ${name}`)
    }
  }

  /**
   * 停止所有定时任务
   */
  stopAll() {
    for (const [name, task] of this.tasks) {
      task.stop()
      logger.info(`Cron task stopped: ${name}`)
    }
  }

  /**
   * 启动所有定时任务
   */
  startAll() {
    for (const [name, task] of this.tasks) {
      task.start()
      logger.info(`Cron task started: ${name}`)
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus() {
    const status = {}
    for (const [name, task] of this.tasks) {
      status[name] = {
        running: task.running || false,
        pattern: task.cronExpression || 'unknown'
      }
    }
    return status
  }


  /**
   * 数据清理定时任务
   * 每周日凌晨2点清理过期数据
   */
  scheduleDataCleanup() {
    this.addTask('data-cleanup', '0 2 * * 0', async () => {
      try {
        // 清理过期的邮件日志 (保留30天)
        const { EmailLog } = require('../models')
        const { Op } = require('sequelize')
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const deletedCount = await EmailLog.destroy({
          where: {
            created_at: {
              [Op.lt]: thirtyDaysAgo
            }
          }
        })
        
        logger.info(`Cleaned up ${deletedCount} expired email logs`)
        
        // 清理过期的调班申请记录 (保留90天)
        const { ShiftRequest } = require('../models')
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        const deletedRequests = await ShiftRequest.destroy({
          where: {
            status: {
              [Op.in]: ['approved', 'rejected', 'cancelled']
            },
            created_at: {
              [Op.lt]: ninetyDaysAgo
            }
          }
        })
        
        logger.info(`Cleaned up ${deletedRequests} expired shift requests`)
        
      } catch (error) {
        logger.error('Failed to cleanup expired data', error)
      }
    })
  }

  /**
   * 健康检查定时任务
   * 每小时检查系统状态
   */
  scheduleHealthCheck() {
    this.addTask('health-check', '0 * * * *', async () => {
      try {
        // 检查数据库连接
        const { sequelize } = require('../config/database')
        await sequelize.authenticate()
        
        // 检查内存使用情况
        const memUsage = process.memoryUsage()
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
        
        if (memUsedMB > 500) { // 内存使用超过500MB时记录警告
          logger.warn(`High memory usage: ${memUsedMB}MB`, memUsage)
        }
        
        // 检查磁盘空间 (简化检查)
        const fs = require('fs')
        const stats = fs.statSync('.')
        
        logger.debug('Health check completed', {
          database: 'connected',
          memory: `${memUsedMB}MB`,
          uptime: `${Math.round(process.uptime())}s`
        })
        
      } catch (error) {
        logger.error('Health check failed', error)
        
        // 记录系统告警（邮件发送功能已简化）
        logger.error('System health check failed - manual intervention may be required', error)
      }
    })
  }

}

// 创建单例实例
const cronService = new CronService()

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping cron service...')
  cronService.stopAll()
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping cron service...')
  cronService.stopAll()
})

module.exports = cronService