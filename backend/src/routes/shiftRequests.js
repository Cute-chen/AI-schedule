const express = require('express')
const { Op } = require('sequelize')
const { ShiftRequest, Employee, Schedule, TimeSlot, sequelize } = require('../models')
const { protect } = require('../controllers/authController')
const emailService = require('../services/emailService')
const router = express.Router()

// 时间格式化工具函数
const formatDateTime = (date) => {
  if (!date) return null
  // 使用数据库原始时间，避免时区转换
  // 将UTC时间转换为本地时间
  const utcDate = new Date(date.getTime() + (8 * 60 * 60 * 1000)) // 加8小时转换为中国时区
  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  const hours = String(utcDate.getUTCHours()).padStart(2, '0')
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const formatDate = (date) => {
  if (!date) return null
  // 使用数据库原始时间，避免时区转换
  // 将UTC时间转换为本地时间
  const utcDate = new Date(date.getTime() + (8 * 60 * 60 * 1000)) // 加8小时转换为中国时区
  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 调班申请处理函数
const handleSwapRequest = async (shiftRequest, transaction) => {
  if (!shiftRequest.original_schedule_id || !shiftRequest.target_employee_id) {
    throw new Error('换班申请必须指定原排班ID和目标员工ID')
  }

  // 获取原排班信息
  const originalSchedule = await Schedule.findByPk(shiftRequest.original_schedule_id, { transaction })
  if (!originalSchedule) {
    throw new Error('原排班不存在')
  }

  // 查找目标员工在相同时间段的排班
  const targetSchedule = await Schedule.findOne({
    where: {
      employee_id: shiftRequest.target_employee_id,
      schedule_date: shiftRequest.target_date || originalSchedule.schedule_date,
      time_slot_id: shiftRequest.target_time_slot_id || originalSchedule.time_slot_id,
      status: { [Op.in]: ['scheduled', 'confirmed'] }
    },
    transaction
  })

  if (!targetSchedule) {
    throw new Error('目标员工在指定时间段没有排班')
  }

  // 交换两个员工的排班
  const originalEmployeeId = originalSchedule.employee_id
  const targetEmployeeId = targetSchedule.employee_id

  await originalSchedule.update({ 
    employee_id: targetEmployeeId 
  }, { transaction })
  
  await targetSchedule.update({ 
    employee_id: originalEmployeeId 
  }, { transaction })

  return { originalSchedule, targetSchedule }
}

const handleTransferRequest = async (shiftRequest, transaction) => {
  if (!shiftRequest.original_schedule_id) {
    throw new Error('调班申请必须指定原排班ID')
  }

  // 获取原排班信息
  const originalSchedule = await Schedule.findByPk(shiftRequest.original_schedule_id, { transaction })
  if (!originalSchedule) {
    throw new Error('原排班不存在')
  }

  // 检查目标时间段是否有冲突
  if (shiftRequest.target_date || shiftRequest.target_time_slot_id) {
    const conflictSchedule = await Schedule.findOne({
      where: {
        employee_id: originalSchedule.employee_id,
        schedule_date: shiftRequest.target_date || originalSchedule.schedule_date,
        time_slot_id: shiftRequest.target_time_slot_id || originalSchedule.time_slot_id,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        id: { [Op.ne]: originalSchedule.id }
      },
      transaction
    })

    if (conflictSchedule) {
      throw new Error('目标时间段已有排班冲突')
    }
  }

  // 更新排班信息
  const updateData = {}
  if (shiftRequest.target_date) {
    updateData.schedule_date = shiftRequest.target_date
  }
  if (shiftRequest.target_time_slot_id) {
    updateData.time_slot_id = shiftRequest.target_time_slot_id
  }

  if (Object.keys(updateData).length > 0) {
    await originalSchedule.update(updateData, { transaction })
  }

  return { originalSchedule }
}

const handleCancelRequest = async (shiftRequest, transaction) => {
  if (!shiftRequest.original_schedule_id) {
    throw new Error('取消申请必须指定原排班ID')
  }

  // 获取原排班信息
  const originalSchedule = await Schedule.findByPk(shiftRequest.original_schedule_id, { transaction })
  if (!originalSchedule) {
    throw new Error('原排班不存在')
  }

  // 将排班状态设为取消
  await originalSchedule.update({ 
    status: 'cancelled' 
  }, { transaction })

  return { originalSchedule }
}

// 应用认证中间件到所有路由
router.use(protect)

// 获取班次请求列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      type, 
      status,
      employeeId,
      dateRange
    } = req.query

    const offset = (page - 1) * size
    const limit = parseInt(size)

    // 构建查询条件
    const where = {}
    if (type) {
      where.request_type = type
    }
    if (status) {
      where.status = status
    }
    if (employeeId) {
      where.requester_id = employeeId
    }
    if (dateRange && dateRange.length === 2) {
      where.created_at = {
        [Op.between]: [
          new Date(dateRange[0] + ' 00:00:00'),
          new Date(dateRange[1] + ' 23:59:59')
        ]
      }
    }

    const { count, rows } = await ShiftRequest.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'requester',
          attributes: ['id', 'name', 'employee_no', 'position']
        },
        {
          model: Employee,
          as: 'targetEmployee',
          attributes: ['id', 'name', 'employee_no', 'position'],
          required: false
        },
        {
          model: Schedule,
          as: 'originalSchedule',
          attributes: ['id', 'schedule_date', 'time_slot_id'],
          required: false,
          include: [{
            model: TimeSlot,
            as: 'timeSlot',
            attributes: ['id', 'name', 'start_time', 'end_time']
          }]
        },
        {
          model: TimeSlot,
          as: 'targetTimeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time'],
          required: false
        }
      ],
      offset,
      limit,
      order: [['created_at', 'DESC']]
    })

    // 字段映射转换
    const mappedRows = rows.map(row => ({
      id: row.id,
      type: row.request_type,
      originalDate: row.originalSchedule?.schedule_date || formatDate(row.created_at),
      requestedDate: row.target_date,
      originalTimeSlot: row.originalSchedule?.timeSlot ? {
        id: row.originalSchedule.timeSlot.id,
        name: row.originalSchedule.timeSlot.name,
        startTime: row.originalSchedule.timeSlot.start_time,
        endTime: row.originalSchedule.timeSlot.end_time
      } : null,
      targetTimeSlot: row.targetTimeSlot ? {
        id: row.targetTimeSlot.id,
        name: row.targetTimeSlot.name,
        startTime: row.targetTimeSlot.start_time,
        endTime: row.targetTimeSlot.end_time
      } : null,
      reason: row.reason,
      status: row.status,
      urgency: row.urgency || 3,
      employeeId: row.requester_id,
      targetEmployeeId: row.target_employee_id,
      createdAt: formatDateTime(row.created_at),
      employee: row.requester,
      targetEmployee: row.targetEmployee,
      responseNote: row.approval_notes,
      reviewedAt: row.approved_at
    }))

    res.json({
      success: true,
      data: {
        data: mappedRows,
        total: count,
        page: parseInt(page),
        size: limit
      }
    })
  } catch (error) {
    console.error('获取班次请求列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取班次请求列表失败',
      error: error.message
    })
  }
})

// 创建班次请求
router.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      type,
      originalDate,
      requestedDate,
      reason,
      urgency,
      targetEmployeeId,
      originalScheduleId,
      targetScheduleId
    } = req.body

    // 字段映射转换
    const requester_id = employeeId
    const request_type = type
    let target_date = requestedDate || originalDate
    let target_time_slot_id = null

    // 如果有目标排班ID，获取目标排班的详细信息
    if (targetScheduleId && request_type === 'swap') {
      const targetSchedule = await Schedule.findByPk(targetScheduleId, {
        include: [{
          model: TimeSlot,
          as: 'timeSlot'
        }]
      })
      
      if (targetSchedule) {
        target_date = targetSchedule.schedule_date
        target_time_slot_id = targetSchedule.time_slot_id
        console.log('目标排班信息:', {
          id: targetSchedule.id,
          date: target_date,
          time_slot_id: target_time_slot_id,
          employee_id: targetSchedule.employee_id
        })
      }
    }

    // 检查申请人是否存在
    const requester = await Employee.findByPk(requester_id)
    if (!requester) {
      return res.status(404).json({
        success: false,
        message: '申请人不存在'
      })
    }

    // 如果提供了原排班ID，验证排班存在且属于申请人
    if (originalScheduleId) {
      const schedule = await Schedule.findOne({
        where: {
          id: originalScheduleId,
          employee_id: requester_id
        }
      })

      if (!schedule) {
        return res.status(400).json({
          success: false,
          message: '指定的排班不存在或不属于申请人'
        })
      }
    }

    const shiftRequest = await ShiftRequest.create({
      requester_id,
      request_type,
      original_schedule_id: originalScheduleId,
      target_employee_id: targetEmployeeId || null, // 处理空字符串，转换为null
      target_time_slot_id,
      target_date,
      reason,
      status: 'pending'
    })

    // 返回包含申请人信息的请求数据
    const requestWithEmployee = await ShiftRequest.findByPk(shiftRequest.id, {
      include: [
        {
          model: Employee,
          as: 'requester',
          attributes: ['id', 'name', 'employee_no', 'position']
        },
        {
          model: Employee,
          as: 'targetEmployee',
          attributes: ['id', 'name', 'employee_no', 'position'],
          required: false
        }
      ]
    })

    // 发送调班申请通知给管理员
    try {
      const requestWithDetails = await ShiftRequest.findByPk(shiftRequest.id, {
        include: [
          {
            model: Employee,
            as: 'requester',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Schedule,
            as: 'originalSchedule',
            include: [{
              model: TimeSlot,
              as: 'timeSlot'
            }]
          },
          {
            model: TimeSlot,
            as: 'targetTimeSlot'
          }
        ]
      })

      await emailService.sendShiftRequestNotification(requestWithDetails)
    } catch (emailError) {
      console.error('发送调班申请通知失败:', emailError)
      // 不影响申请创建，只记录错误
    }

    // 字段映射转换返回数据
    const mappedData = {
      id: requestWithEmployee.id,
      type: requestWithEmployee.request_type,
      originalDate: requestWithEmployee.target_date || formatDate(requestWithEmployee.created_at),
      requestedDate: requestWithEmployee.target_date,
      reason: requestWithEmployee.reason,
      status: requestWithEmployee.status,
      urgency: requestWithEmployee.urgency || 3,
      employeeId: requestWithEmployee.requester_id,
      targetEmployeeId: requestWithEmployee.target_employee_id,
      createdAt: formatDateTime(requestWithEmployee.created_at),
      employee: requestWithEmployee.requester,
      targetEmployee: requestWithEmployee.targetEmployee
    }

    res.status(201).json({
      success: true,
      message: '班次请求创建成功',
      data: mappedData
    })
  } catch (error) {
    console.error('创建班次请求失败:', error)
    res.status(500).json({
      success: false,
      message: '创建班次请求失败',
      error: error.message
    })
  }
})

// 更新班次请求
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      type,
      originalDate,
      requestedDate,
      reason,
      urgency,
      targetEmployeeId
    } = req.body

    // 字段映射转换
    const request_type = type
    const target_date = requestedDate || originalDate
    const target_employee_id = targetEmployeeId

    const shiftRequest = await ShiftRequest.findByPk(id)
    if (!shiftRequest) {
      return res.status(404).json({
        success: false,
        message: '班次请求不存在'
      })
    }

    // 只有待审核的请求可以修改
    if (shiftRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只有待审核的请求可以修改'
      })
    }

    await shiftRequest.update({
      request_type: request_type || shiftRequest.request_type,
      target_date: target_date || shiftRequest.target_date,
      reason: reason || shiftRequest.reason,
      target_employee_id: target_employee_id !== undefined ? (target_employee_id || null) : shiftRequest.target_employee_id
    })

    // 返回更新后的请求信息
    const updatedRequest = await ShiftRequest.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'requester',
          attributes: ['id', 'name', 'employee_no', 'position']
        },
        {
          model: Employee,
          as: 'targetEmployee',
          attributes: ['id', 'name', 'employee_no', 'position'],
          required: false
        }
      ]
    })

    // 字段映射转换
    const mappedData = {
      id: updatedRequest.id,
      type: updatedRequest.request_type,
      originalDate: updatedRequest.target_date || formatDate(updatedRequest.created_at),
      requestedDate: updatedRequest.target_date,
      reason: updatedRequest.reason,
      status: updatedRequest.status,
      urgency: updatedRequest.urgency || 3,
      employeeId: updatedRequest.requester_id,
      targetEmployeeId: updatedRequest.target_employee_id,
      createdAt: formatDateTime(updatedRequest.created_at),
      employee: updatedRequest.requester,
      targetEmployee: updatedRequest.targetEmployee
    }

    res.json({
      success: true,
      message: '班次请求更新成功',
      data: mappedData
    })
  } catch (error) {
    console.error('更新班次请求失败:', error)
    res.status(500).json({
      success: false,
      message: '更新班次请求失败',
      error: error.message
    })
  }
})

// 批准班次请求
router.post('/:id/approve', async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const { id } = req.params
    const { note } = req.body

    const shiftRequest = await ShiftRequest.findByPk(id, { transaction })
    if (!shiftRequest) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        message: '班次请求不存在'
      })
    }

    if (shiftRequest.status !== 'pending') {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: '该请求已被处理'
      })
    }

    // 更新申请状态
    await shiftRequest.update({
      status: 'approved',
      approved_at: new Date(),
      approval_notes: note,
      approved_by: req.user?.id || 1
    }, { transaction })

    // 根据申请类型处理排班表更新
    let scheduleUpdateResult = null
    try {
      switch (shiftRequest.request_type) {
        case 'swap':
          scheduleUpdateResult = await handleSwapRequest(shiftRequest, transaction)
          break
        case 'transfer':
          scheduleUpdateResult = await handleTransferRequest(shiftRequest, transaction)
          break
        case 'cancel':
          scheduleUpdateResult = await handleCancelRequest(shiftRequest, transaction)
          break
        default:
          throw new Error(`不支持的申请类型: ${shiftRequest.request_type}`)
      }
    } catch (scheduleError) {
      console.error('处理排班更新失败:', scheduleError)
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: `批准失败: ${scheduleError.message}`
      })
    }

    // 发送调班成功通知给申请人
    try {
      const requestWithDetails = await ShiftRequest.findByPk(shiftRequest.id, {
        include: [
          {
            model: Employee,
            as: 'requester',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Schedule,
            as: 'originalSchedule',
            include: [{
              model: TimeSlot,
              as: 'timeSlot'
            }]
          },
          {
            model: TimeSlot,
            as: 'targetTimeSlot'
          }
        ],
        transaction
      })

      // 确保有邮箱再发送
      if (requestWithDetails.requester && requestWithDetails.requester.email) {
        await emailService.sendShiftRequestApprovedNotification(requestWithDetails)
      }
    } catch (emailError) {
      console.error('发送调班成功通知失败:', emailError)
      // 不影响批准流程，只记录错误
    }

    await transaction.commit()

    res.json({
      success: true,
      message: '班次请求已批准，排班表已更新',
      data: {
        requestId: shiftRequest.id,
        requestType: shiftRequest.request_type,
        scheduleUpdate: scheduleUpdateResult
      }
    })
  } catch (error) {
    console.error('批准班次请求失败:', error)
    await transaction.rollback()
    res.status(500).json({
      success: false,
      message: '批准班次请求失败',
      error: error.message
    })
  }
})

// 拒绝班次请求
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params
    const { note } = req.body

    const shiftRequest = await ShiftRequest.findByPk(id)
    if (!shiftRequest) {
      return res.status(404).json({
        success: false,
        message: '班次请求不存在'
      })
    }

    if (shiftRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该请求已被处理'
      })
    }

    await shiftRequest.update({
      status: 'rejected',
      approved_at: new Date(),
      approval_notes: note,
      approved_by: req.user?.id || 1 // 临时设置默认值用于测试
    })

    res.json({
      success: true,
      message: '班次请求已拒绝'
    })
  } catch (error) {
    console.error('拒绝班次请求失败:', error)
    res.status(500).json({
      success: false,
      message: '拒绝班次请求失败',
      error: error.message
    })
  }
})

// 获取请求统计
router.get('/stats', async (req, res) => {
  try {
    const stats = await ShiftRequest.findAll({
      attributes: [
        'status',
        [ShiftRequest.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status']
    })

    const statusStats = {
      pending: 0,
      approved: 0,
      rejected: 0
    }

    stats.forEach(stat => {
      statusStats[stat.status] = parseInt(stat.dataValues.count)
    })

    const total = Object.values(statusStats).reduce((sum, count) => sum + count, 0)

    res.json({
      success: true,
      data: {
        ...statusStats,
        total
      }
    })
  } catch (error) {
    console.error('获取请求统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取请求统计失败',
      error: error.message
    })
  }
})

// 获取员工自己的班次请求列表
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      page = 1, 
      size = 10, 
      type, 
      status,
      dateRange
    } = req.query

    const offset = (page - 1) * size
    const limit = parseInt(size)

    // 构建查询条件
    const where = {
      requester_id: userId
    }
    if (type) {
      where.request_type = type
    }
    if (status) {
      where.status = status
    }
    if (dateRange && dateRange.length === 2) {
      where.target_date = {
        [Op.between]: dateRange
      }
    }

    const { count, rows } = await ShiftRequest.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'requester',
          attributes: ['id', 'name', 'employee_no', 'position']
        },
        {
          model: Employee,
          as: 'targetEmployee',
          attributes: ['id', 'name', 'employee_no', 'position'],
          required: false
        },
        {
          model: Schedule,
          as: 'originalSchedule',
          attributes: ['id', 'schedule_date', 'time_slot_id'],
          required: false,
          include: [{
            model: TimeSlot,
            as: 'timeSlot',
            attributes: ['id', 'name', 'start_time', 'end_time']
          }]
        },
        {
          model: TimeSlot,
          as: 'targetTimeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time'],
          required: false
        }
      ],
      offset,
      limit,
      order: [['created_at', 'DESC']]
    })

    // 字段映射转换
    const mappedRows = rows.map(row => ({
      id: row.id,
      type: row.request_type,
      originalDate: row.originalSchedule?.schedule_date || formatDate(row.created_at),
      requestedDate: row.target_date,
      originalTimeSlot: row.originalSchedule?.timeSlot ? {
        id: row.originalSchedule.timeSlot.id,
        name: row.originalSchedule.timeSlot.name,
        startTime: row.originalSchedule.timeSlot.start_time,
        endTime: row.originalSchedule.timeSlot.end_time
      } : null,
      targetTimeSlot: row.targetTimeSlot ? {
        id: row.targetTimeSlot.id,
        name: row.targetTimeSlot.name,
        startTime: row.targetTimeSlot.start_time,
        endTime: row.targetTimeSlot.end_time
      } : null,
      reason: row.reason,
      status: row.status,
      urgency: row.urgency || 3,
      employeeId: row.requester_id,
      targetEmployeeId: row.target_employee_id,
      createdAt: formatDateTime(row.created_at),
      employee: row.requester,
      targetEmployee: row.targetEmployee,
      responseNote: row.approval_notes,
      reviewedAt: row.approved_at
    }))

    res.json({
      success: true,
      data: {
        data: mappedRows,
        total: count,
        page: parseInt(page),
        size: limit
      }
    })
  } catch (error) {
    console.error('获取我的班次请求列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取请求列表失败',
      error: error.message
    })
  }
})

// 获取我的可调班排班列表
router.get('/my-schedules', async (req, res) => {
  try {
    const userId = req.user.id
    console.log('获取用户排班列表 - 用户ID:', userId, '用户姓名:', req.user.name)
    
    const { date } = req.query

    const where = {
      employee_id: userId,
      status: ['scheduled', 'confirmed'] // 只查询可调班的状态
    }

    // 日期筛选：默认查询今天及以后的排班
    const today = new Date().toISOString().split('T')[0]
    
    if (date) {
      where.schedule_date = {
        [Op.gte]: date
      }
    } else {
      where.schedule_date = {
        [Op.gte]: today
      }
    }

    console.log('查询条件:', JSON.stringify(where, null, 2))
    
    const schedules = await Schedule.findAll({
      where,
      include: [{
        model: TimeSlot,
        as: 'timeSlot',
        attributes: ['id', 'name', 'start_time', 'end_time']
      }],
      order: [['schedule_date', 'ASC']]
    })

    console.log('找到可调班的排班数量:', schedules.length)

    res.json({
      success: true,
      data: schedules
    })
  } catch (error) {
    console.error('获取我的排班失败:', error)
    res.status(500).json({
      success: false,
      message: '获取排班数据失败',
      error: error.message
    })
  }
})

// 获取可交换的选项
router.get('/available-swaps/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params
    const userId = req.user.id

    console.log('获取可交换选项 - 用户ID:', userId, '排班ID:', scheduleId)

    // 获取原排班信息
    const originalSchedule = await Schedule.findOne({
      where: { id: scheduleId, employee_id: userId },
      include: [{
        model: TimeSlot,
        as: 'timeSlot'
      }]
    })

    if (!originalSchedule) {
      console.log('排班不存在或无权限 - 排班ID:', scheduleId, '用户ID:', userId)
      return res.status(404).json({
        success: false,
        message: '排班不存在或无权限'
      })
    }

    console.log('原排班信息:', {
      id: originalSchedule.id,
      schedule_date: originalSchedule.schedule_date,
      employee_id: originalSchedule.employee_id,
      status: originalSchedule.status
    })

    // 查找其他员工的排班（可以是不同日期）
    // 通常查找未来2周内的排班作为可交换选项
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 14) // 未来2周

    const availableSwaps = await Schedule.findAll({
      where: {
        schedule_date: {
          [Op.gte]: new Date().toISOString().split('T')[0], // 从今天开始
          [Op.lte]: futureDate.toISOString().split('T')[0]   // 到2周后
        },
        employee_id: { [Op.ne]: userId }, // 不是当前用户
        status: ['scheduled', 'confirmed'], // 可交换的状态
        id: { [Op.ne]: scheduleId } // 不是自己选择的排班
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'name', 'employee_no', 'position']
        },
        {
          model: TimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time']
        }
      ],
      order: [['schedule_date', 'ASC'], ['time_slot_id', 'ASC']]
    })

    console.log('找到可交换选项数量:', availableSwaps.length)
    availableSwaps.forEach(swap => {
      console.log('可交换选项:', {
        id: swap.id,
        employee_name: swap.employee?.name,
        time_slot: swap.timeSlot?.name,
        status: swap.status
      })
    })

    res.json({
      success: true,
      data: {
        originalSchedule,
        availableSwaps
      }
    })
  } catch (error) {
    console.error('获取可交换选项失败:', error)
    res.status(500).json({
      success: false,
      message: '获取可交换选项失败',
      error: error.message
    })
  }
})

// 撤销班次请求 (员工)
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const shiftRequest = await ShiftRequest.findOne({
      where: { 
        id, 
        requester_id: userId // 只能撤销自己的请求
      }
    })

    if (!shiftRequest) {
      return res.status(404).json({
        success: false,
        message: '班次请求不存在或无权限'
      })
    }

    if (shiftRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只有待审核的请求可以撤销'
      })
    }

    await shiftRequest.update({
      status: 'cancelled',
      updated_at: new Date()
    })

    res.json({
      success: true,
      message: '班次请求已撤销'
    })
  } catch (error) {
    console.error('撤销班次请求失败:', error)
    res.status(500).json({
      success: false,
      message: '撤销班次请求失败',
      error: error.message
    })
  }
})

// 删除班次请求 (管理员) - 软删除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const shiftRequest = await ShiftRequest.findByPk(id)
    if (!shiftRequest) {
      return res.status(404).json({
        success: false,
        message: '班次请求不存在'
      })
    }

    // 使用软删除，所有状态的请求都可以删除
    await shiftRequest.destroy()

    const statusText = {
      pending: '待审核',
      approved: '已批准', 
      rejected: '已拒绝',
      cancelled: '已撤销'
    }

    res.json({
      success: true,
      message: `${statusText[shiftRequest.status] || ''}的班次请求已删除`
    })
  } catch (error) {
    console.error('删除班次请求失败:', error)
    res.status(500).json({
      success: false,
      message: '删除班次请求失败',
      error: error.message
    })
  }
})

module.exports = router