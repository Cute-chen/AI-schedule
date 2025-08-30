const { Schedule, Employee, TimeSlot, SystemSettings } = require('../models')
const { Op } = require('sequelize')
const settingsHelper = require('../utils/settingsHelper')

/**
 * 工时统计服务
 * 提供员工工时计算和统计功能
 */
class WorkHoursService {
  /**
   * 计算单个员工指定时间范围内的工时
   * @param {number} employeeId - 员工ID
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 工时统计数据
   */
  async calculateEmployeeWorkHours(employeeId, startDate, endDate) {
    try {
      console.log('计算员工工时:', { employeeId, startDate, endDate })

      // 查询员工信息
      const employee = await Employee.findByPk(employeeId, {
        attributes: ['id', 'name', 'employee_no', 'position']
      })

      if (!employee) {
        throw new Error('员工不存在')
      }

      // 查询该时间范围内的所有排班记录
      const schedules = await Schedule.findAll({
        where: {
          employee_id: employeeId,
          schedule_date: {
            [Op.between]: [
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            ]
          },
          status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] }
        },
        include: [
          {
            model: TimeSlot,
            as: 'timeSlot',
            attributes: ['id', 'name', 'start_time', 'end_time', 'day_of_week']
          }
        ],
        order: [['schedule_date', 'ASC']]
      })

      console.log(`找到${schedules.length}个排班记录`)

      // 计算工时统计
      const statistics = await this.calculateWorkHoursStatistics(schedules, startDate, endDate)

      return {
        employeeInfo: {
          id: employee.id,
          name: employee.name,
          employee_no: employee.employee_no,
          position: employee.position
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        },
        statistics,
        schedules: schedules.length
      }
    } catch (error) {
      console.error('计算员工工时失败:', error)
      throw error
    }
  }

  /**
   * 计算所有员工指定时间范围内的工时
   * @param {Date} startDate - 开始日期  
   * @param {Date} endDate - 结束日期
   * @returns {Array} 所有员工的工时统计数据
   */
  async calculateAllEmployeesWorkHours(startDate, endDate) {
    try {
      console.log('计算所有员工工时:', { startDate, endDate })

      // 获取所有活跃员工
      const employees = await Employee.findAll({
        where: { status: 'active' },
        attributes: ['id', 'name', 'employee_no', 'position']
      })

      console.log(`找到${employees.length}个活跃员工`)

      // 批量查询所有员工的排班记录
      const allSchedules = await Schedule.findAll({
        where: {
          employee_id: { [Op.in]: employees.map(emp => emp.id) },
          schedule_date: {
            [Op.between]: [
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            ]
          },
          status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] }
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
            attributes: ['id', 'name', 'start_time', 'end_time', 'day_of_week']
          }
        ]
      })

      console.log(`找到${allSchedules.length}个排班记录`)

      // 按员工分组
      const schedulesByEmployee = {}
      allSchedules.forEach(schedule => {
        const employeeId = schedule.employee_id
        if (!schedulesByEmployee[employeeId]) {
          schedulesByEmployee[employeeId] = []
        }
        schedulesByEmployee[employeeId].push(schedule)
      })

      // 计算每个员工的工时统计
      const results = []
      let totalWorkHours = 0
      let totalEmployees = 0

      for (const employee of employees) {
        const employeeSchedules = schedulesByEmployee[employee.id] || []
        const statistics = await this.calculateWorkHoursStatistics(employeeSchedules, startDate, endDate)

        const employeeResult = {
          employeeInfo: {
            id: employee.id,
            name: employee.name,
            employee_no: employee.employee_no,
            position: employee.position
          },
          statistics,
          schedules: employeeSchedules.length
        }

        results.push(employeeResult)
        totalWorkHours += statistics.totalHours
        if (statistics.totalHours > 0) totalEmployees++
      }

      // 计算汇总统计
      const summary = {
        totalEmployees: employees.length,
        activeEmployees: totalEmployees,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        averageWorkHours: totalEmployees > 0 ? Math.round((totalWorkHours / totalEmployees) * 100) / 100 : 0,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        }
      }

      return {
        summary,
        employees: results.sort((a, b) => b.statistics.totalHours - a.statistics.totalHours)
      }
    } catch (error) {
      console.error('计算所有员工工时失败:', error)
      throw error
    }
  }

  /**
   * 计算工时统计数据
   * @param {Array} schedules - 排班记录数组
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 工时统计结果
   */
  async calculateWorkHoursStatistics(schedules, startDate, endDate) {
    let totalHours = 0
    const dailyStats = {}
    const weeklyStats = {}

    // 获取周起始日期，用于周次计算
    const weekStartDate = await settingsHelper.getWeekStartDate()

    for (const schedule of schedules) {
      if (!schedule.timeSlot) {
        console.warn('排班记录缺少时间段信息:', schedule.id)
        continue
      }

      // 计算该班次的工时
      const hours = this.convertTimeToHours(
        schedule.timeSlot.start_time,
        schedule.timeSlot.end_time
      )

      totalHours += hours

      // 按日统计
      const dateKey = schedule.schedule_date
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          hours: 0,
          shifts: 0
        }
      }
      dailyStats[dateKey].hours += hours
      dailyStats[dateKey].shifts += 1

      // 按周统计
      const scheduleDate = new Date(schedule.schedule_date)
      const weekNumber = await this.calculateWeekNumber(scheduleDate, weekStartDate)
      
      if (!weeklyStats[weekNumber]) {
        weeklyStats[weekNumber] = {
          week: weekNumber,
          hours: 0,
          shifts: 0
        }
      }
      weeklyStats[weekNumber].hours += hours
      weeklyStats[weekNumber].shifts += 1
    }

    // 格式化统计数据
    const dailyStatsArray = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))
    const weeklyStatsArray = Object.values(weeklyStats).sort((a, b) => a.week - b.week)

    // 计算工作天数（有排班的天数）
    const workDays = dailyStatsArray.length

    // 计算平均工时
    const averageDailyHours = workDays > 0 ? Math.round((totalHours / workDays) * 100) / 100 : 0

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      workDays,
      totalShifts: schedules.length,
      averageDailyHours,
      dailyStats: dailyStatsArray,
      weeklyStats: weeklyStatsArray
    }
  }

  /**
   * 将时间字符串转换为小时数
   * @param {string} startTime - 开始时间 HH:mm:ss
   * @param {string} endTime - 结束时间 HH:mm:ss
   * @returns {number} 工作小时数
   */
  convertTimeToHours(startTime, endTime) {
    try {
      // 处理时间格式，确保是 HH:mm 格式
      const start = startTime.substring(0, 5) // 取前5位 HH:mm
      const end = endTime.substring(0, 5)

      // 创建今天的时间对象
      const startDate = new Date(`1970-01-01 ${start}:00`)
      const endDate = new Date(`1970-01-01 ${end}:00`)

      // 处理跨天情况（如夜班：22:00 - 06:00）
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1)
      }

      // 计算时间差（毫秒）
      const diffMs = endDate.getTime() - startDate.getTime()
      
      // 转换为小时
      const hours = diffMs / (1000 * 60 * 60)

      return Math.round(hours * 100) / 100 // 保留2位小数
    } catch (error) {
      console.error('时间转换失败:', { startTime, endTime, error })
      return 8 // 默认8小时
    }
  }

  /**
   * 计算周数
   * @param {Date} date - 目标日期
   * @param {Date} weekStartDate - 周起始日期
   * @returns {number} 周数
   */
  async calculateWeekNumber(date, weekStartDate) {
    try {
      const targetDate = new Date(date)
      const startDate = new Date(weekStartDate)

      // 计算天数差
      const daysDiff = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24))
      
      // 计算周数（从1开始）
      const weekNumber = Math.floor(daysDiff / 7) + 1

      return Math.max(1, weekNumber) // 确保周数不小于1
    } catch (error) {
      console.error('计算周数失败:', error)
      return 1
    }
  }

  /**
   * 根据周起始日期和周次范围计算日期范围
   * @param {number} startWeek - 起始周数
   * @param {number} endWeek - 结束周数
   * @param {Date} weekStartDate - 周起始日期（可选）
   * @returns {Object} {startDate, endDate}
   */
  async calculateDateRangeFromWeeks(startWeek, endWeek, weekStartDate = null) {
    try {
      // 如果没有提供周起始日期，从系统设置获取
      const baseWeekStart = weekStartDate || await settingsHelper.getWeekStartDate()

      console.log('计算日期范围:', { startWeek, endWeek, baseWeekStart })

      // 计算起始日期
      const startDate = new Date(baseWeekStart)
      startDate.setDate(baseWeekStart.getDate() + (startWeek - 1) * 7)

      // 计算结束日期
      const endDate = new Date(baseWeekStart)
      endDate.setDate(baseWeekStart.getDate() + (endWeek * 7) - 1)

      console.log('计算得到日期范围:', { startDate, endDate })

      return {
        startDate,
        endDate,
        startWeek,
        endWeek,
        baseWeekStart: baseWeekStart.toISOString().split('T')[0]
      }
    } catch (error) {
      console.error('计算日期范围失败:', error)
      throw new Error('计算日期范围失败: ' + error.message)
    }
  }

  /**
   * 格式化工时统计数据
   * @param {Object} rawData - 原始数据
   * @returns {Object} 格式化后的数据
   */
  formatWorkHoursData(rawData) {
    if (!rawData) return null

    return {
      ...rawData,
      statistics: {
        ...rawData.statistics,
        // 添加格式化的统计信息
        totalHoursFormatted: `${rawData.statistics.totalHours} 小时`,
        averageDailyHoursFormatted: `${rawData.statistics.averageDailyHours} 小时/天`,
        workDaysFormatted: `${rawData.statistics.workDays} 天`
      }
    }
  }
}

module.exports = new WorkHoursService()