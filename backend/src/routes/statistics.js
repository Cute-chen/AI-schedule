const express = require('express')
const { Op } = require('sequelize')
const { Employee, Schedule, ShiftRequest, Availability } = require('../models')
const router = express.Router()

// 获取统计概览
router.get('/overview', async (req, res) => {
  try {
    const [
      totalEmployees,
      totalSchedules, 
      totalHours,
      pendingRequests
    ] = await Promise.all([
      Employee.count({ where: { status: 'active' } }),
      Schedule.count({ where: { status: { [Op.in]: ['scheduled', 'confirmed'] } } }),
      Schedule.sum('duration_hours') || 0,
      ShiftRequest.count({ where: { status: 'pending' } })
    ])

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalSchedules,
        totalHours: Math.round(totalHours),
        pendingRequests
      }
    })
  } catch (error) {
    console.error('获取统计概览失败:', error)
    res.status(500).json({
      success: false,
      message: '获取统计概览失败',
      error: error.message
    })
  }
})

// 获取员工统计
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { status: 'active' },
      include: [
        {
          model: Schedule,
          as: 'schedules',
          attributes: ['duration_hours'],
          where: { status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] } },
          required: false
        }
      ]
    })

    const employeeStats = employees.map(emp => {
      const totalHours = emp.schedules?.reduce((sum, schedule) => sum + (schedule.duration_hours || 8), 0) || 0
      const totalShifts = emp.schedules?.length || 0
      const averageHours = totalShifts > 0 ? Math.round(totalHours / totalShifts * 10) / 10 : 0
      
      return {
        name: emp.name,
        employee_no: emp.employee_no,
        position: emp.position || '未设置',
        totalHours,
        totalShifts,
        averageHours,
        attendanceRate: Math.min(95 + Math.random() * 5, 100), // 模拟出勤率
        overtimeHours: Math.max(0, totalHours - totalShifts * 8)
      }
    })

    res.json({
      success: true,
      data: {
        data: employeeStats,
        total: employeeStats.length
      }
    })
  } catch (error) {
    console.error('获取员工统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取员工统计失败',
      error: error.message
    })
  }
})


// 获取班次统计
router.get('/shifts', async (req, res) => {
  try {
    const shiftStats = await Schedule.findAll({
      attributes: [
        'shift',
        [Schedule.sequelize.fn('COUNT', '*'), 'totalCount'],
        [Schedule.sequelize.fn('SUM', Schedule.sequelize.col('duration_hours')), 'totalHours'],
        [Schedule.sequelize.fn('AVG', Schedule.sequelize.col('duration_hours')), 'averageEmployees']
      ],
      where: { status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] } },
      group: ['shift']
    })

    const formattedStats = shiftStats.map(stat => ({
      shiftType: stat.shift,
      totalCount: parseInt(stat.dataValues.totalCount),
      totalHours: Math.round(parseFloat(stat.dataValues.totalHours || 0)),
      averageEmployees: Math.round(parseFloat(stat.dataValues.averageEmployees || 0)),
      popularityRate: Math.min(2 + Math.random() * 3, 5) // 模拟受欢迎度
    }))

    res.json({
      success: true,
      data: {
        data: formattedStats,
        total: formattedStats.length
      }
    })
  } catch (error) {
    console.error('获取班次统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取班次统计失败',
      error: error.message
    })
  }
})

// 获取请求统计
router.get('/requests', async (req, res) => {
  try {
    const requestStats = await ShiftRequest.findAll({
      attributes: [
        'request_type',
        [ShiftRequest.sequelize.fn('COUNT', '*'), 'totalCount'],
        [ShiftRequest.sequelize.fn('COUNT', 
          ShiftRequest.sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")
        ), 'approvedCount'],
        [ShiftRequest.sequelize.fn('COUNT', 
          ShiftRequest.sequelize.literal("CASE WHEN status = 'rejected' THEN 1 END")
        ), 'rejectedCount'],
        [ShiftRequest.sequelize.fn('COUNT', 
          ShiftRequest.sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")
        ), 'pendingCount']
      ],
      group: ['request_type']
    })

    const formattedStats = requestStats.map(stat => {
      const totalCount = parseInt(stat.dataValues.totalCount)
      const approvedCount = parseInt(stat.dataValues.approvedCount || 0)
      const rejectedCount = parseInt(stat.dataValues.rejectedCount || 0)
      const pendingCount = parseInt(stat.dataValues.pendingCount || 0)
      const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

      return {
        type: stat.request_type,
        totalCount,
        approvedCount,
        rejectedCount,
        pendingCount,
        approvalRate,
        averageProcessTime: '2.5小时' // 模拟平均处理时间
      }
    })

    res.json({
      success: true,
      data: {
        data: formattedStats,
        total: formattedStats.length
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

// 导出报表
router.get('/export', async (req, res) => {
  try {
    // 这里可以实现真正的报表导出功能
    res.json({
      success: true,
      message: '报表导出功能待实现',
      data: { downloadUrl: '/api/statistics/download/report.xlsx' }
    })
  } catch (error) {
    console.error('导出报表失败:', error)
    res.status(500).json({
      success: false,
      message: '导出报表失败',
      error: error.message
    })
  }
})

// 引入工时统计服务
const workHoursService = require('../services/workHoursService')

// 获取员工工时统计
router.get('/employee-workhours', async (req, res) => {
  try {
    const { employeeId, startWeek, endWeek, weekStartDate } = req.query
    
    // 参数验证
    if (!startWeek || !endWeek) {
      return res.status(400).json({
        success: false,
        message: '请提供起始周数和结束周数'
      })
    }

    // 计算日期范围
    const dateRange = await workHoursService.calculateDateRangeFromWeeks(
      parseInt(startWeek), 
      parseInt(endWeek), 
      weekStartDate ? new Date(weekStartDate) : null
    )

    let result
    if (employeeId) {
      // 单个员工工时统计
      result = await workHoursService.calculateEmployeeWorkHours(
        parseInt(employeeId),
        dateRange.startDate,
        dateRange.endDate
      )
    } else {
      // 所有员工工时统计
      result = await workHoursService.calculateAllEmployeesWorkHours(
        dateRange.startDate,
        dateRange.endDate
      )
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取工时统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取工时统计失败',
      error: error.message
    })
  }
})

// 获取所有员工工时统计（管理员专用）
router.get('/all-employees-workhours', async (req, res) => {
  try {
    const { startWeek, endWeek, weekStartDate } = req.query
    
    // 参数验证
    if (!startWeek || !endWeek) {
      return res.status(400).json({
        success: false,
        message: '请提供起始周数和结束周数'
      })
    }

    // 计算日期范围
    const dateRange = await workHoursService.calculateDateRangeFromWeeks(
      parseInt(startWeek),
      parseInt(endWeek),
      weekStartDate ? new Date(weekStartDate) : null
    )

    // 获取所有员工工时统计
    const result = await workHoursService.calculateAllEmployeesWorkHours(
      dateRange.startDate,
      dateRange.endDate
    )

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取所有员工工时统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取所有员工工时统计失败',
      error: error.message
    })
  }
})

module.exports = router