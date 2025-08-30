const express = require('express')
const { Op } = require('sequelize')
const { Schedule, Employee, TimeSlot } = require('../models')
const settingsHelper = require('../utils/settingsHelper')
const batchService = require('../services/batchService')
const emailService = require('../services/emailService')
const router = express.Router()

// 获取排班列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      employeeId, 
      department,
      dateRange,
      status
    } = req.query

    const offset = (page - 1) * size
    // 当按日期范围查询时，增加限制数量以获取完整数据
    let limit = parseInt(size)
    if (dateRange && dateRange.length === 2) {
      limit = 1000 // 增加限制数量以确保能获取一周内的所有排班数据
    }

    // 构建查询条件
    const where = {
      status: { [Op.ne]: 'cancelled' } // 排除已取消的排班
    }
    if (employeeId) {
      where.employee_id = employeeId
    }
    if (status) {
      where.status = status
    }
    if (dateRange && dateRange.length === 2) {
      where.schedule_date = {
        [Op.between]: dateRange
      }
    }

    const include = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no', 'position']
      },
      {
        model: TimeSlot,
        as: 'timeSlot',
        attributes: ['id', 'name', 'start_time', 'end_time', 'required_people']
      }
    ]

    // 如果按部门筛选
    if (department) {
      include[0].where = {
        [Op.or]: [
          { position: { [Op.like]: `%${department}%` } }
        ]
      }
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      include,
      offset,
      limit,
      order: [['schedule_date', 'DESC'], ['created_at', 'DESC']]
    })

    res.json({
      success: true,
      data: {
        data: rows,
        total: count,
        page: parseInt(page),
        size: limit
      }
    })
  } catch (error) {
    console.error('获取排班列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取排班列表失败',
      error: error.message
    })
  }
})

// 创建排班
router.post('/', async (req, res) => {
  try {
    const {
      employee_id,
      time_slot_id,
      week_start_date,
      schedule_date,
      notes
    } = req.body

    // 检查员工是否存在
    const employee = await Employee.findByPk(employee_id)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    // 检查时间段是否存在
    const timeSlot = await TimeSlot.findByPk(time_slot_id)
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: '时间段不存在'
      })
    }

    // 验证排班日期是否为工作日
    const scheduleDateTime = new Date(schedule_date)
    const isWorkDay = await settingsHelper.validateScheduleDate(scheduleDateTime)
    if (!isWorkDay) {
      return res.status(400).json({
        success: false,
        message: '该日期不是工作日，无法创建排班'
      })
    }

    // 计算正确的周起始日期（基于系统设置）
    const calculatedWeekStart = await settingsHelper.calculateWeekStart(scheduleDateTime)
    const finalWeekStartDate = week_start_date || settingsHelper.formatDate(calculatedWeekStart)

    // 检查是否有冲突的排班
    const conflictSchedule = await Schedule.findOne({
      where: {
        employee_id,
        schedule_date,
        status: { [Op.in]: ['scheduled', 'confirmed'] }
      }
    })

    if (conflictSchedule) {
      return res.status(400).json({
        success: false,
        message: '该员工在此日期已有排班'
      })
    }

    const schedule = await Schedule.create({
      employee_id,
      time_slot_id,
      week_start_date: finalWeekStartDate,
      schedule_date,
      status: 'scheduled',
      assigned_method: 'manual',
      notes
    })

    // 返回包含员工信息的排班数据
    const scheduleWithEmployee = await Schedule.findByPk(schedule.id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no', 'position']
      }]
    })

    res.status(201).json({
      success: true,
      message: '排班创建成功',
      data: scheduleWithEmployee
    })
  } catch (error) {
    console.error('创建排班失败:', error)
    res.status(500).json({
      success: false,
      message: '创建排班失败',
      error: error.message
    })
  }
})

// 更新排班
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      employee_id,
      schedule_date,
      shift,
      start_time,
      end_time,
      status,
      notes
    } = req.body

    const schedule = await Schedule.findByPk(id)
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '排班不存在'
      })
    }

    // 如果更新了员工或日期，检查冲突
    if ((employee_id && employee_id !== schedule.employee_id) || 
        (schedule_date && schedule_date !== schedule.schedule_date)) {
      const conflictSchedule = await Schedule.findOne({
        where: {
          employee_id: employee_id || schedule.employee_id,
          schedule_date: schedule_date || schedule.schedule_date,
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          id: { [Op.ne]: id }
        }
      })

      if (conflictSchedule) {
        return res.status(400).json({
          success: false,
          message: '该员工在此日期已有排班'
        })
      }
    }

    await schedule.update({
      employee_id: employee_id || schedule.employee_id,
      schedule_date: schedule_date || schedule.schedule_date,
      shift: shift || schedule.shift,
      start_time: start_time || schedule.start_time,
      end_time: end_time || schedule.end_time,
      status: status || schedule.status,
      notes: notes !== undefined ? notes : schedule.notes
    })

    // 返回更新后的排班信息
    const updatedSchedule = await Schedule.findByPk(id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no', 'position']
      }]
    })

    res.json({
      success: true,
      message: '排班更新成功',
      data: updatedSchedule
    })
  } catch (error) {
    console.error('更新排班失败:', error)
    res.status(500).json({
      success: false,
      message: '更新排班失败',
      error: error.message
    })
  }
})

// 删除排班
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const schedule = await Schedule.findByPk(id)
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '排班不存在'
      })
    }

    // 硬删除排班记录
    await schedule.destroy()

    res.json({
      success: true,
      message: '排班删除成功'
    })
  } catch (error) {
    console.error('删除排班失败:', error)
    res.status(500).json({
      success: false,
      message: '删除排班失败',
      error: error.message
    })
  }
})

// 批量排班
router.post('/batch', async (req, res) => {
  try {
    const { schedules } = req.body

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的排班列表'
      })
    }

    const results = []
    const errors = []

    for (const scheduleData of schedules) {
      try {
        // 检查员工是否存在
        const employee = await Employee.findByPk(scheduleData.employee_id)
        if (!employee) {
          errors.push({
            data: scheduleData,
            error: '员工不存在'
          })
          continue
        }

        // 验证排班日期是否为工作日
        const scheduleDateTime = new Date(scheduleData.schedule_date)
        const isWorkDay = await settingsHelper.validateScheduleDate(scheduleDateTime)
        if (!isWorkDay) {
          errors.push({
            data: scheduleData,
            error: '该日期不是工作日'
          })
          continue
        }

        // 计算正确的周起始日期
        const calculatedWeekStart = await settingsHelper.calculateWeekStart(scheduleDateTime)
        const weekStartDate = scheduleData.week_start_date || settingsHelper.formatDate(calculatedWeekStart)

        // 检查冲突
        const conflictSchedule = await Schedule.findOne({
          where: {
            employee_id: scheduleData.employee_id,
            schedule_date: scheduleData.schedule_date,
            status: { [Op.in]: ['scheduled', 'confirmed'] }
          }
        })

        if (conflictSchedule) {
          errors.push({
            data: scheduleData,
            error: '该员工在此日期已有排班'
          })
          continue
        }

        const schedule = await Schedule.create({
          ...scheduleData,
          week_start_date: weekStartDate,
          status: 'scheduled',
          assigned_method: 'manual'
        })

        results.push(schedule)
      } catch (error) {
        errors.push({
          data: scheduleData,
          error: error.message
        })
      }
    }

    res.json({
      success: true,
      message: '批量排班完成',
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors
      }
    })
  } catch (error) {
    console.error('批量排班失败:', error)
    res.status(500).json({
      success: false,
      message: '批量排班失败',
      error: error.message
    })
  }
})

// 批量排班 - 高级版本
router.post('/batch-advanced', async (req, res) => {
  try {
    const { weeks, strategy, overwriteExisting } = req.body
    
    if (!weeks || !Array.isArray(weeks)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的周次列表'
      })
    }

    const result = await batchService.batchCreateSchedule({
      weeks,
      strategy,
      overwriteExisting
    })

    res.json({
      success: true,
      message: '批量排班已启动',
      data: result
    })
  } catch (error) {
    console.error('批量排班失败:', error)
    res.status(500).json({
      success: false,
      message: '批量排班失败',
      error: error.message
    })
  }
})

// 批量调班
router.post('/batch-adjust', async (req, res) => {
  try {
    const { weeks, adjustments, type } = req.body
    
    if (!weeks || !adjustments) {
      return res.status(400).json({
        success: false,
        message: '请提供必要的参数'
      })
    }

    const result = await batchService.batchAdjustSchedule({
      weeks,
      adjustments,
      type
    })

    res.json({
      success: true,
      message: '批量调班已启动',
      data: result
    })
  } catch (error) {
    console.error('批量调班失败:', error)
    res.status(500).json({
      success: false,
      message: '批量调班失败',
      error: error.message
    })
  }
})

// 复制排班到指定周
router.post('/copy', async (req, res) => {
  try {
    const { sourceWeek, targetWeeks, overwrite = false } = req.body
    
    if (!sourceWeek || !targetWeeks) {
      return res.status(400).json({
        success: false,
        message: '请提供源周次和目标周次'
      })
    }

    // 简化的复制排班逻辑
    const result = await copySchedulesToWeeks(sourceWeek, targetWeeks, overwrite)
    
    res.json({
      success: true,
      message: '排班复制成功',
      data: { created: result.length }
    })
  } catch (error) {
    console.error('复制排班失败:', error)
    res.status(500).json({
      success: false,
      message: '复制排班失败',
      error: error.message
    })
  }
})


// 发送AI排班通知
router.post('/send-notifications', async (req, res) => {
  try {
    const { weekStart } = req.body

    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: '请提供周起始日期'
      })
    }

    // 计算周结束日期
    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)

    // 获取该周的所有排班
    const schedules = await Schedule.findAll({
      where: {
        schedule_date: {
          [Op.between]: [
            weekStartDate.toISOString().split('T')[0],
            weekEndDate.toISOString().split('T')[0]
          ]
        },
        status: { [Op.in]: ['scheduled', 'confirmed'] }
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time']
        }
      ]
    })

    if (schedules.length === 0) {
      return res.json({
        success: false,
        message: '该周没有找到排班记录'
      })
    }

    // 过滤出有邮箱的员工排班
    const schedulesWithEmail = schedules.filter(schedule => 
      schedule.employee && schedule.employee.email
    )

    if (schedulesWithEmail.length === 0) {
      return res.json({
        success: false,
        message: '没有员工设置邮箱，无法发送通知'
      })
    }

    // 发送AI排班通知
    const result = await emailService.sendAIScheduleNotification(schedulesWithEmail)

    res.json({
      success: true,
      message: `成功发送${schedulesWithEmail.length}个排班通知`,
      data: result
    })
  } catch (error) {
    console.error('发送排班通知失败:', error)
    res.status(500).json({
      success: false,
      message: '发送排班通知失败',
      error: error.message
    })
  }
})

// 批量删除排班 - 按周范围删除
router.post('/batch-delete-weeks', async (req, res) => {
  try {
    const { weekOffsets, deleteMode = 'permanent' } = req.body

    // 验证必要参数
    if (!weekOffsets || !Array.isArray(weekOffsets) || weekOffsets.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的周次偏移量'
      })
    }

    console.log('开始批量删除排班:', {
      weekOffsets,
      deleteMode
    })

    let deletedCount = 0
    let failedCount = 0
    const errors = []

    // 获取当前周的起始日期作为基准
    const currentDate = new Date()
    const currentWeekStart = await settingsHelper.calculateWeekStart(currentDate)
    
    // 对每个周偏移进行删除
    for (const weekOffset of weekOffsets) {
      try {
        console.log(`处理周偏移 ${weekOffset}`)
        
        // 计算目标周的开始和结束日期
        const targetWeekStart = new Date(currentWeekStart)
        targetWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7))
        
        const targetWeekEnd = new Date(targetWeekStart)
        targetWeekEnd.setDate(targetWeekStart.getDate() + 6)
        
        const startDateStr = targetWeekStart.toISOString().split('T')[0]
        const endDateStr = targetWeekEnd.toISOString().split('T')[0]

        console.log(`删除周次 ${weekOffset}: ${startDateStr} 到 ${endDateStr}`)

        // 查找该周的所有排班
        const weekSchedules = await Schedule.findAll({
          where: {
            schedule_date: {
              [Op.between]: [startDateStr, endDateStr]
            },
            status: { [Op.in]: ['scheduled', 'confirmed'] }
          }
        })

        console.log(`找到 ${weekSchedules.length} 个排班记录`)

        // 根据删除模式进行处理
        if (deleteMode === 'permanent') {
          // 永久删除
          const deleteResult = await Schedule.destroy({
            where: {
              schedule_date: {
                [Op.between]: [startDateStr, endDateStr]
              },
              status: { [Op.in]: ['scheduled', 'confirmed'] }
            }
          })
          deletedCount += deleteResult
          console.log(`永久删除了 ${deleteResult} 个排班`)
        } else {
          // 软删除（状态改为cancelled）
          const updateResult = await Schedule.update(
            { status: 'cancelled' },
            {
              where: {
                schedule_date: {
                  [Op.between]: [startDateStr, endDateStr]
                },
                status: { [Op.in]: ['scheduled', 'confirmed'] }
              }
            }
          )
          deletedCount += updateResult[0]
          console.log(`软删除了 ${updateResult[0]} 个排班`)
        }

      } catch (weekError) {
        console.error(`处理周偏移 ${weekOffset} 失败:`, weekError)
        failedCount++
        errors.push({
          weekOffset,
          message: `处理周偏移失败: ${weekError.message}`
        })
      }
    }

    console.log('批量删除完成:', { deletedCount, failedCount, errorsCount: errors.length })

    res.json({
      success: true,
      message: `批量删除完成：删除${deletedCount}个排班，失败${failedCount}个周次`,
      data: {
        deletedCount,
        failedCount,
        errors: errors.slice(0, 10)
      }
    })

  } catch (error) {
    console.error('批量删除排班失败:', error)
    res.status(500).json({
      success: false,
      message: '批量删除排班失败',
      error: error.message
    })
  }
})

// 同步排班到其他周
router.post('/sync-to-weeks', async (req, res) => {
  try {
    const { 
      sourceWeekStart, 
      targetWeekOffsets, 
      conflictMode = 'skip', 
      schedules 
    } = req.body

    // 验证必要参数
    if (!sourceWeekStart || !targetWeekOffsets || !Array.isArray(targetWeekOffsets) || !schedules) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：sourceWeekStart, targetWeekOffsets, schedules'
      })
    }

    if (targetWeekOffsets.length === 0 || schedules.length === 0) {
      return res.json({
        success: true,
        message: '没有需要同步的数据',
        data: { successCount: 0, failedCount: 0, errors: [] }
      })
    }

    console.log('开始同步排班到其他周:', {
      sourceWeekStart,
      targetWeekOffsets,
      conflictMode,
      schedulesCount: schedules.length
    })

    let successCount = 0
    let failedCount = 0
    const errors = []

    // 解析源周开始日期
    const sourceWeekStartDate = new Date(sourceWeekStart)
    
    // 对每个目标周进行同步
    for (const weekOffset of targetWeekOffsets) {
      try {
        console.log(`处理周偏移 ${weekOffset}`)
        
        // 计算目标周的开始日期
        const targetWeekStartDate = new Date(sourceWeekStartDate)
        targetWeekStartDate.setDate(sourceWeekStartDate.getDate() + (weekOffset * 7))
        
        // 为每个排班记录创建对应的目标周记录
        for (const schedule of schedules) {
          try {
            // 计算目标日期（保持相同的星期几）
            const sourceDate = new Date(schedule.schedule_date)
            const daysDiff = Math.floor((sourceDate.getTime() - sourceWeekStartDate.getTime()) / (1000 * 60 * 60 * 24))
            
            const targetDate = new Date(targetWeekStartDate)
            targetDate.setDate(targetWeekStartDate.getDate() + daysDiff)
            const targetDateStr = targetDate.toISOString().split('T')[0]

            // 检查是否存在冲突
            const conflictKey = `${schedule.employee_id}_${targetDateStr}_${schedule.time_slot_id}`
            
            const existingSchedule = await Schedule.findOne({
              where: {
                employee_id: schedule.employee_id,
                schedule_date: targetDateStr,
                time_slot_id: schedule.time_slot_id,
                status: { [Op.in]: ['scheduled', 'confirmed'] }
              }
            })

            if (existingSchedule) {
              if (conflictMode === 'skip') {
                console.log(`跳过冲突: ${conflictKey}`)
                continue
              } else if (conflictMode === 'overwrite') {
                // 更新现有记录
                await existingSchedule.update({
                  ai_confidence: schedule.ai_confidence,
                  ai_reason: schedule.ai_reason,
                  notes: schedule.notes,
                  week_start_date: targetWeekStartDate.toISOString().split('T')[0]
                })
                console.log(`覆盖现有排班: ${conflictKey}`)
                successCount++
                continue
              }
            }

            // 创建新的排班记录
            const newSchedule = await Schedule.create({
              employee_id: schedule.employee_id,
              time_slot_id: schedule.time_slot_id,
              schedule_date: targetDateStr,
              week_start_date: targetWeekStartDate.toISOString().split('T')[0],
              status: 'scheduled',
              ai_confidence: schedule.ai_confidence,
              ai_reason: schedule.ai_reason,
              notes: schedule.notes
            })

            console.log(`成功创建排班: ${conflictKey}`)
            successCount++

          } catch (scheduleError) {
            console.error(`处理单个排班失败:`, scheduleError)
            failedCount++
            errors.push({
              weekOffset,
              schedule: `${schedule.employee_id}_${schedule.schedule_date}_${schedule.time_slot_id}`,
              message: scheduleError.message
            })
          }
        }
      } catch (weekError) {
        console.error(`处理周偏移 ${weekOffset} 失败:`, weekError)
        failedCount += schedules.length // 整个周的排班都失败了
        errors.push({
          weekOffset,
          message: `处理周偏移失败: ${weekError.message}`
        })
      }
    }

    console.log('同步完成:', { successCount, failedCount, errorsCount: errors.length })

    res.json({
      success: true,
      message: `同步完成：成功${successCount}个，失败${failedCount}个`,
      data: {
        successCount,
        failedCount,
        errors: errors.slice(0, 10) // 只返回前10个错误信息
      }
    })

  } catch (error) {
    console.error('同步排班到其他周失败:', error)
    res.status(500).json({
      success: false,
      message: '同步排班失败',
      error: error.message
    })
  }
})

// 简化的复制排班功能
async function copySchedulesToWeeks(sourceWeek, targetWeeks, overwrite = false) {
  try {
    // 获取源周的排班
    const sourceSchedules = await Schedule.findAll({
      where: {
        week_start_date: sourceWeek
      },
      include: [
        { model: Employee, as: 'employee' },
        { model: TimeSlot, as: 'timeSlot' }
      ]
    })

    if (sourceSchedules.length === 0) {
      throw new Error('源周没有找到排班数据')
    }

    const results = []
    
    for (const targetWeek of targetWeeks) {
      // 如果不覆盖，先检查目标周是否已有排班
      if (!overwrite) {
        const existingCount = await Schedule.count({
          where: { week_start_date: targetWeek }
        })
        
        if (existingCount > 0) {
          console.log(`目标周 ${targetWeek} 已有排班，跳过`)
          continue
        }
      } else {
        // 如果覆盖，先删除目标周的现有排班
        await Schedule.destroy({
          where: { week_start_date: targetWeek }
        })
      }

      // 复制排班到目标周
      for (const schedule of sourceSchedules) {
        // 计算目标日期
        const sourceDate = new Date(schedule.schedule_date)
        const sourceWeekDate = new Date(sourceWeek)
        const targetWeekDate = new Date(targetWeek)
        
        const daysDiff = Math.floor((sourceDate - sourceWeekDate) / (24 * 60 * 60 * 1000))
        const targetDate = new Date(targetWeekDate)
        targetDate.setDate(targetWeekDate.getDate() + daysDiff)

        const newSchedule = await Schedule.create({
          employee_id: schedule.employee_id,
          time_slot_id: schedule.time_slot_id,
          week_start_date: targetWeek,
          schedule_date: targetDate.toISOString().split('T')[0],
          status: 'scheduled',
          assigned_method: 'copy',
          notes: `复制自${sourceWeek}周`
        })
        
        results.push(newSchedule)
      }
    }

    return results
  } catch (error) {
    console.error('复制排班失败:', error)
    throw error
  }
}

module.exports = router