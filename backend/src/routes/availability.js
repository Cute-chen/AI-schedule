const express = require('express')
const { Op } = require('sequelize')
const { Availability, Employee, TimeSlot } = require('../models')
const batchService = require('../services/batchService')
const router = express.Router()

// 获取可用性列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 50, 
      employeeId, 
      startDate,
      endDate,
      type 
    } = req.query

    const offset = (page - 1) * size
    const limit = parseInt(size)

    // 构建查询条件
    const where = {}
    if (employeeId) {
      where.employee_id = employeeId
    }
    if (type) {
      where.is_available = type === 'available' ? true : false
    }
    if (startDate && endDate) {
      where.week_start_date = {
        [Op.between]: [startDate, endDate]
      }
    }

    const { count, rows } = await Availability.findAndCountAll({
      where,
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no']
      }, {
        model: TimeSlot,
        as: 'timeSlot',
        attributes: ['id', 'name', 'start_time', 'end_time', 'day_of_week', 'required_people']
      }],
      offset,
      limit,
      order: [['week_start_date', 'DESC'], ['created_at', 'DESC']]
    })

    // 转换数据格式以匹配前端期望
    const formattedRows = rows.map(row => {
      const data = row.toJSON()
      return {
        id: data.id,
        employeeId: data.employee_id,
        timeSlotId: data.time_slot_id,
        date: data.week_start_date,
        priority: data.priority,
        notes: data.notes,
        employee: data.employee,
        timeSlot: data.timeSlot ? {
          id: data.timeSlot.id,
          name: data.timeSlot.name,
          startTime: data.timeSlot.start_time,
          endTime: data.timeSlot.end_time,
          dayOfWeek: data.timeSlot.day_of_week,
          requiredPeople: data.timeSlot.required_people
        } : null,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    })

    res.json({
      success: true,
      data: formattedRows,
      total: count,
      page: parseInt(page),
      size: limit
    })
  } catch (error) {
    console.error('获取可用性列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取可用性列表失败',
      error: error.message
    })
  }
})

// 创建可用性
router.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      timeSlotId,
      date,
      priority = 3,
      notes
    } = req.body

    // 检查员工是否存在
    const employee = await Employee.findByPk(employeeId)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    // 检查是否已存在相同的记录
    const existingAvailability = await Availability.findOne({
      where: {
        employee_id: employeeId,
        time_slot_id: timeSlotId,
        week_start_date: date
      }
    })

    if (existingAvailability) {
      return res.status(409).json({
        success: false,
        message: '该空闲时间记录已存在'
      })
    }

    const availability = await Availability.create({
      employee_id: employeeId,
      time_slot_id: timeSlotId,
      week_start_date: date,
      is_available: true,
      priority: priority || 3,
      notes
    })

    // 返回包含员工信息的可用性数据
    const availabilityWithEmployee = await Availability.findByPk(availability.id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no']
      }, {
        model: TimeSlot,
        as: 'timeSlot',
        attributes: ['id', 'name', 'start_time', 'end_time', 'day_of_week', 'required_people']
      }]
    })

    // 转换数据格式
    const data = availabilityWithEmployee.toJSON()
    const formattedData = {
      id: data.id,
      employeeId: data.employee_id,
      timeSlotId: data.time_slot_id,
      date: data.week_start_date,
      priority: data.priority,
      notes: data.notes,
      employee: data.employee,
      timeSlot: data.timeSlot ? {
        id: data.timeSlot.id,
        name: data.timeSlot.name,
        startTime: data.timeSlot.start_time,
        endTime: data.timeSlot.end_time,
        dayOfWeek: data.timeSlot.day_of_week,
        requiredPeople: data.timeSlot.required_people
      } : null
    }

    res.status(201).json({
      success: true,
      message: '可用性创建成功',
      data: formattedData
    })
  } catch (error) {
    console.error('创建可用性失败:', error)
    res.status(500).json({
      success: false,
      message: '创建可用性失败',
      error: error.message
    })
  }
})

// 更新可用性
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      employee_id,
      time_slot_id,
      week_start_date,
      is_available,
      priority,
      notes
    } = req.body

    const availability = await Availability.findByPk(id)
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: '可用性记录不存在'
      })
    }

    await availability.update({
      employee_id: employee_id || availability.employee_id,
      time_slot_id: time_slot_id || availability.time_slot_id,
      week_start_date: week_start_date || availability.week_start_date,
      is_available: is_available !== undefined ? is_available : availability.is_available,
      priority: priority !== undefined ? priority : availability.priority,
      notes: notes !== undefined ? notes : availability.notes
    })

    // 返回更新后的可用性信息
    const updatedAvailability = await Availability.findByPk(id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'employee_no', 'position']
      }, {
        model: TimeSlot,
        as: 'timeSlot',
        attributes: ['id', 'name', 'start_time', 'end_time', 'day_of_week']
      }]
    })

    res.json({
      success: true,
      message: '可用性更新成功',
      data: updatedAvailability
    })
  } catch (error) {
    console.error('更新可用性失败:', error)
    res.status(500).json({
      success: false,
      message: '更新可用性失败',
      error: error.message
    })
  }
})

// 删除可用性
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const availability = await Availability.findByPk(id)
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: '可用性记录不存在'
      })
    }

    await availability.destroy()

    res.json({
      success: true,
      message: '可用性删除成功'
    })
  } catch (error) {
    console.error('删除可用性失败:', error)
    res.status(500).json({
      success: false,
      message: '删除可用性失败',
      error: error.message
    })
  }
})

// 批量创建可用性
router.post('/batch', async (req, res) => {
  try {
    const { 
      employeeId,
      startDate,
      endDate,
      timeSlotIds,
      priority = 3,
      notes
    } = req.body

    if (!employeeId || !startDate || !endDate || !timeSlotIds || !Array.isArray(timeSlotIds)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的参数'
      })
    }

    // 检查员工是否存在
    const employee = await Employee.findByPk(employeeId)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    const results = []
    const errors = []

    // 生成日期范围内的所有日期
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates = []
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }

    // 为每个日期和时间段创建可用性记录
    for (const date of dates) {
      for (const timeSlotId of timeSlotIds) {
        try {
          // 检查是否已存在
          const existing = await Availability.findOne({
            where: {
              employee_id: employeeId,
              time_slot_id: timeSlotId,
              week_start_date: date
            }
          })

          if (existing) {
            continue // 跳过已存在的记录
          }

          const availability = await Availability.create({
            employee_id: employeeId,
            time_slot_id: timeSlotId,
            week_start_date: date,
            is_available: true,
            priority: priority || 3,
            notes
          })

          results.push(availability)
        } catch (error) {
          errors.push({
            date,
            timeSlotId,
            error: error.message
          })
        }
      }
    }

    res.json({
      success: true,
      message: '批量创建可用性完成',
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors
      }
    })
  } catch (error) {
    console.error('批量创建可用性失败:', error)
    res.status(500).json({
      success: false,
      message: '批量创建可用性失败',
      error: error.message
    })
  }
})

// 获取时间段配置
router.get('/timeslots', async (req, res) => {
  try {
    const timeSlots = await TimeSlot.findAll({
      where: { is_active: true },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
    })

    // 转换数据格式
    const formattedSlots = timeSlots.map(slot => {
      const data = slot.toJSON()
      return {
        id: data.id,
        name: data.name,
        startTime: data.start_time,
        endTime: data.end_time,
        dayOfWeek: data.day_of_week,
        requiredPeople: data.required_people,
        isActive: data.is_active
      }
    })

    res.json({
      success: true,
      data: formattedSlots
    })
  } catch (error) {
    console.error('获取时间段失败:', error)
    res.status(500).json({
      success: false,
      message: '获取时间段失败',
      error: error.message
    })
  }
})

// 创建时间段
router.post('/timeslots', async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      dayOfWeek,
      requiredPeople = 1
    } = req.body

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的时间段信息'
      })
    }

    const timeSlot = await TimeSlot.create({
      name,
      start_time: startTime,
      end_time: endTime,
      day_of_week: dayOfWeek || null,
      required_people: requiredPeople,
      is_active: true
    })

    // 转换数据格式
    const formattedSlot = {
      id: timeSlot.id,
      name: timeSlot.name,
      startTime: timeSlot.start_time,
      endTime: timeSlot.end_time,
      dayOfWeek: timeSlot.day_of_week,
      requiredPeople: timeSlot.required_people,
      isActive: timeSlot.is_active
    }

    res.status(201).json({
      success: true,
      message: '时间段创建成功',
      data: formattedSlot
    })
  } catch (error) {
    console.error('创建时间段失败:', error)
    res.status(500).json({
      success: false,
      message: '创建时间段失败',
      error: error.message
    })
  }
})

// 更新时间段
router.put('/timeslots/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      startTime,
      endTime,
      dayOfWeek,
      requiredPeople,
      isActive
    } = req.body

    const timeSlot = await TimeSlot.findByPk(id)
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: '时间段不存在'
      })
    }

    await timeSlot.update({
      name: name || timeSlot.name,
      start_time: startTime || timeSlot.start_time,
      end_time: endTime || timeSlot.end_time,
      day_of_week: dayOfWeek !== undefined ? dayOfWeek : timeSlot.day_of_week,
      required_people: requiredPeople !== undefined ? requiredPeople : timeSlot.required_people,
      is_active: isActive !== undefined ? isActive : timeSlot.is_active
    })

    // 转换数据格式
    const formattedSlot = {
      id: timeSlot.id,
      name: timeSlot.name,
      startTime: timeSlot.start_time,
      endTime: timeSlot.end_time,
      dayOfWeek: timeSlot.day_of_week,
      requiredPeople: timeSlot.required_people,
      isActive: timeSlot.is_active
    }

    res.json({
      success: true,
      message: '时间段更新成功',
      data: formattedSlot
    })
  } catch (error) {
    console.error('更新时间段失败:', error)
    res.status(500).json({
      success: false,
      message: '更新时间段失败',
      error: error.message
    })
  }
})

// 删除时间段
router.delete('/timeslots/:id', async (req, res) => {
  try {
    const { id } = req.params

    const timeSlot = await TimeSlot.findByPk(id)
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: '时间段不存在'
      })
    }

    // 检查是否有关联的可用性记录
    const availabilityCount = await Availability.count({
      where: { time_slot_id: id }
    })

    if (availabilityCount > 0) {
      // 软删除 - 设置为不活跃
      await timeSlot.update({ is_active: false })
      res.json({
        success: true,
        message: '时间段已停用（因为存在关联的空闲时间记录）'
      })
    } else {
      // 物理删除
      await timeSlot.destroy()
      res.json({
        success: true,
        message: '时间段删除成功'
      })
    }
  } catch (error) {
    console.error('删除时间段失败:', error)
    res.status(500).json({
      success: false,
      message: '删除时间段失败',
      error: error.message
    })
  }
})

// 批量操作相关路由
// 高级批量创建空闲时间
router.post('/batch-advanced', async (req, res) => {
  try {
    const { employeeId, timeSlotIds, weeks, priority, notes } = req.body
    
    if (!employeeId || !timeSlotIds || !weeks) {
      return res.status(400).json({
        success: false,
        message: '请提供必要的参数'
      })
    }

    const result = await batchService.batchCreateAvailability({
      employeeId,
      timeSlotIds,
      weeks,
      priority,
      notes,
    })

    res.json({
      success: true,
      message: '批量操作已启动',
      data: result
    })
  } catch (error) {
    console.error('批量创建空闲时间失败:', error)
    res.status(500).json({
      success: false,
      message: '批量操作失败',
      error: error.message
    })
  }
})

// 获取批量操作状态
router.get('/batch/:id', async (req, res) => {
  try {
    const { id } = req.params
    const status = await batchService.getBatchOperationStatus(id)
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '批量操作不存在'
      })
    }

    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    })
  }
})


// 按周批量删除所有员工的空闲时间
router.delete('/batch/weeks', async (req, res) => {
  try {
    const { weekOffsets } = req.body

    if (!weekOffsets || !Array.isArray(weekOffsets) || weekOffsets.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的周次偏移量'
      })
    }

    let deletedCount = 0
    const errors = []

    // 获取当前日期作为基准
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const weekOffset of weekOffsets) {
      try {
        // 计算目标周的开始和结束日期
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + (weekOffset * 7))
        
        // 获取目标周的周一
        const targetWeekStart = new Date(targetDate)
        const dayOfWeek = targetWeekStart.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        targetWeekStart.setDate(targetWeekStart.getDate() + daysToMonday)
        
        // 获取目标周的周日
        const targetWeekEnd = new Date(targetWeekStart)
        targetWeekEnd.setDate(targetWeekEnd.getDate() + 6)
        
        const startDateStr = targetWeekStart.toISOString().split('T')[0]
        const endDateStr = targetWeekEnd.toISOString().split('T')[0]

        // 删除该周所有员工的所有空闲时间记录
        const deleteResult = await Availability.destroy({
          where: {
            week_start_date: {
              [Op.between]: [startDateStr, endDateStr]
            }
          }
        })

        deletedCount += deleteResult || 0
      } catch (error) {
        console.error(`删除周次 ${weekOffset} 失败:`, error)
        errors.push({
          weekOffset,
          message: error.message
        })
      }
    }

    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 条空闲时间记录`,
      data: {
        deletedCount,
        failedCount: errors.length,
        errors
      }
    })
  } catch (error) {
    console.error('按周批量删除所有员工空闲时间失败:', error)
    res.status(500).json({
      success: false,
      message: '按周批量删除所有员工空闲时间失败',
      error: error.message
    })
  }
})

// 按周批量删除员工空闲时间
router.delete('/employees/:employeeId/weeks', async (req, res) => {
  try {
    const { employeeId } = req.params
    const { weekOffsets } = req.body

    if (!weekOffsets || !Array.isArray(weekOffsets) || weekOffsets.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的周次偏移量'
      })
    }

    // 检查员工是否存在
    const employee = await Employee.findByPk(employeeId)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    let deletedCount = 0
    const errors = []

    // 获取当前日期作为基准
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const weekOffset of weekOffsets) {
      try {
        // 计算目标周的开始和结束日期
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + (weekOffset * 7))
        
        // 获取目标周的周一
        const targetWeekStart = new Date(targetDate)
        const dayOfWeek = targetWeekStart.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        targetWeekStart.setDate(targetWeekStart.getDate() + daysToMonday)
        
        // 获取目标周的周日
        const targetWeekEnd = new Date(targetWeekStart)
        targetWeekEnd.setDate(targetWeekEnd.getDate() + 6)
        
        const startDateStr = targetWeekStart.toISOString().split('T')[0]
        const endDateStr = targetWeekEnd.toISOString().split('T')[0]

        // 删除该员工在该周的所有空闲时间记录
        const deleteResult = await Availability.destroy({
          where: {
            employee_id: employeeId,
            week_start_date: {
              [Op.between]: [startDateStr, endDateStr]
            }
          }
        })

        deletedCount += deleteResult || 0
      } catch (error) {
        console.error(`删除周次 ${weekOffset} 失败:`, error)
        errors.push({
          weekOffset,
          message: error.message
        })
      }
    }

    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 条空闲时间记录`,
      data: {
        deletedCount,
        failedCount: errors.length,
        errors
      }
    })
  } catch (error) {
    console.error('按周批量删除员工空闲时间失败:', error)
    res.status(500).json({
      success: false,
      message: '按周批量删除员工空闲时间失败',
      error: error.message
    })
  }
})

module.exports = router