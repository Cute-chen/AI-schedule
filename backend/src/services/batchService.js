const Availability = require('../models/Availability')
const Schedule = require('../models/Schedule')
const BatchOperation = require('../models/BatchOperation')
const { Op } = require('sequelize')

class BatchService {
  // 批量创建空闲时间
  async batchCreateAvailability(data) {
    const { employeeId, timeSlotIds, weeks, priority = 1, notes = '', templateId = null } = data
    
    const batchOp = await BatchOperation.create({
      operation_type: 'availability',
      operation_name: '批量创建空闲时间',
      target_weeks: weeks,
      operation_data: data,
      status: 'processing'
    })

    try {
      const availabilities = []
      
      for (const week of weeks) {
        const weekStartDate = this.getWeekStartDate(week)
        
        for (const timeSlotId of timeSlotIds) {
          // 检查是否已存在
          const existing = await Availability.findOne({
            where: {
              employee_id: employeeId,
              time_slot_id: timeSlotId,
              week_start_date: weekStartDate
            }
          })
          
          if (!existing) {
            availabilities.push({
              employee_id: employeeId,
              time_slot_id: timeSlotId,
              week_start_date: weekStartDate,
              applies_to_weeks: weeks,
              template_id: templateId,
              priority,
              notes,
              is_available: true
            })
          }
        }
      }

      const created = await Availability.bulkCreate(availabilities)
      
      await batchOp.update({
        status: 'completed',
        progress: 100,
        result_summary: {
          total: availabilities.length,
          created: created.length,
          skipped: availabilities.length - created.length
        },
        completed_at: new Date()
      })

      return {
        batchOperationId: batchOp.id,
        created: created.length,
        total: availabilities.length
      }
    } catch (error) {
      await batchOp.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      })
      throw error
    }
  }

  // 批量创建排班
  async batchCreateSchedule(data) {
    const { weeks, templateId, strategy = 'fair', overwriteExisting = false } = data
    
    const batchOp = await BatchOperation.create({
      operation_type: 'schedule',
      operation_name: '批量创建排班',
      target_weeks: weeks,
      operation_data: data,
      status: 'processing'
    })

    try {
      const schedules = []
      
      for (const week of weeks) {
        const weekStartDate = this.getWeekStartDate(week)
        
        // 如果需要覆盖现有排班
        if (overwriteExisting) {
          await Schedule.destroy({
            where: {
              week_start_date: weekStartDate
            }
          })
        }
        
        // 根据模板或策略生成排班
        const weekSchedules = await this.generateWeekSchedule(weekStartDate, templateId, strategy)
        schedules.push(...weekSchedules)
      }

      const created = await Schedule.bulkCreate(schedules)
      
      await batchOp.update({
        status: 'completed',
        progress: 100,
        result_summary: {
          total: schedules.length,
          created: created.length
        },
        completed_at: new Date()
      })

      return {
        batchOperationId: batchOp.id,
        created: created.length,
        total: schedules.length
      }
    } catch (error) {
      await batchOp.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      })
      throw error
    }
  }

  // 批量调整排班
  async batchAdjustSchedule(data) {
    const { weeks, adjustments, type = 'single' } = data
    
    const batchOp = await BatchOperation.create({
      operation_type: 'adjustment',
      operation_name: '批量调整排班',
      target_weeks: weeks,
      operation_data: data,
      status: 'processing'
    })

    try {
      let adjustedCount = 0
      
      for (const week of weeks) {
        const weekStartDate = this.getWeekStartDate(week)
        
        for (const adjustment of adjustments) {
          const adjusted = await this.applyScheduleAdjustment(weekStartDate, adjustment, type)
          adjustedCount += adjusted
        }
      }
      
      await batchOp.update({
        status: 'completed',
        progress: 100,
        result_summary: {
          adjustedCount
        },
        completed_at: new Date()
      })

      return {
        batchOperationId: batchOp.id,
        adjusted: adjustedCount
      }
    } catch (error) {
      await batchOp.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      })
      throw error
    }
  }

  // 获取批量操作状态
  async getBatchOperationStatus(id) {
    return await BatchOperation.findByPk(id)
  }

  // 获取批量操作列表
  async getBatchOperations(params = {}) {
    const { page = 1, size = 20, type, status } = params
    const where = {}
    
    if (type) where.operation_type = type
    if (status) where.status = status
    
    return await BatchOperation.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: size,
      offset: (page - 1) * size
    })
  }

  // 工具方法：获取周开始日期
  getWeekStartDate(weekNumber) {
    const currentYear = new Date().getFullYear()
    const jan1 = new Date(currentYear, 0, 1)
    const daysOffset = (weekNumber - 1) * 7
    const weekStart = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000)
    
    // 调整到周一
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart.setDate(weekStart.getDate() + daysToMonday)
    
    return weekStart.toISOString().split('T')[0]
  }

  // 生成一周的排班
  async generateWeekSchedule(weekStartDate, templateId, strategy) {
    // 这里应该实现具体的排班算法
    // 简化版本，返回空数组
    return []
  }

  // 应用排班调整
  async applyScheduleAdjustment(weekStartDate, adjustment, type) {
    // 这里应该实现具体的调整逻辑
    return 0
  }
}

module.exports = new BatchService()