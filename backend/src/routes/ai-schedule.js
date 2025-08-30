const express = require('express')
const { Op } = require('sequelize')
const { Schedule, Employee, TimeSlot, Availability } = require('../models')
const aiService = require('../services/aiService')
const settingsHelper = require('../utils/settingsHelper')
const xlsx = require('xlsx')
const moment = require('moment')
const router = express.Router()

// AI自动排班
router.post('/auto', async (req, res) => {
  try {
    const {
      weekStart,
      weekCount = 1,
      strategy = 'fair',
      requirements = '',
      employeeNotes = {}
    } = req.body

    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: '请提供周起始日期'
      })
    }

    console.log('=== AI排班请求开始 ===')
    console.log('请求参数:', {
      weekStart,
      weekCount,
      strategy,
      requirements,
      employeeNotesCount: Object.keys(employeeNotes).length
    })

    const results = []
    const errors = []

    // 处理每一周的排班
    for (let i = 0; i < weekCount; i++) {
      try {
        console.log(`=== 处理第${i + 1}周排班 ===`)
        const currentWeekStart = new Date(weekStart)
        currentWeekStart.setDate(currentWeekStart.getDate() + (i * 7))
        
        const weekEnd = new Date(currentWeekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        console.log('当前周范围:', {
          weekStart: currentWeekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0]
        })

        // 获取该周的员工空闲时间数据
        console.log('开始获取员工空闲时间数据...')
        const availabilityData = await getWeekAvailabilityData(currentWeekStart, weekEnd)
        console.log('员工空闲时间数据:', {
          employeeCount: availabilityData.employees.length,
          employees: availabilityData.employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            availabilityCount: Object.keys(emp.availability || {}).length
          }))
        })

        // 验证基础数据
        if (!availabilityData.employees || availabilityData.employees.length === 0) {
          console.error('错误: 没有找到员工数据')
          errors.push({
            week: i + 1,
            weekStart: currentWeekStart.toISOString().split('T')[0],
            error: '没有找到员工数据，无法进行AI排班'
          })
          continue
        }
        
        // 获取时间段配置
        console.log('获取时间段配置...')
        const timeSlots = await TimeSlot.findAll({
          where: { is_active: true },
          order: [['start_time', 'ASC']]
        })
        console.log('时间段配置:', timeSlots.map(slot => ({
          id: slot.id,
          name: slot.name,
          start_time: slot.start_time,
          end_time: slot.end_time,
          required_people: slot.required_people
        })))

        // 验证时间段数据
        if (!timeSlots || timeSlots.length === 0) {
          console.error('错误: 没有找到活跃的时间段配置')
          errors.push({
            week: i + 1,
            weekStart: currentWeekStart.toISOString().split('T')[0],
            error: '没有找到活跃的时间段配置，无法进行AI排班'
          })
          continue
        }

        // 获取现有排班
        console.log('获取现有排班...')
        const existingSchedules = await Schedule.findAll({
          where: {
            schedule_date: {
              [Op.between]: [
                currentWeekStart.toISOString().split('T')[0],
                weekEnd.toISOString().split('T')[0]
              ]
            },
            status: { [Op.in]: ['scheduled', 'confirmed'] }
          },
          include: [
            {
              model: Employee,
              as: 'employee',
              attributes: ['id', 'name']
            },
            {
              model: TimeSlot,
              as: 'timeSlot',
              attributes: ['id', 'name']
            }
          ]
        })
        console.log('现有排班:', existingSchedules.map(schedule => ({
          employee_name: schedule.employee?.name,
          date: schedule.schedule_date,
          time_slot_name: schedule.timeSlot?.name
        })))

        // 构建AI排班数据
        console.log('构建AI排班数据...')
        const scheduleData = {
          employees: availabilityData.employees,
          timeSlots: timeSlots.map(slot => ({
            id: slot.id,
            name: slot.name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            required_people: slot.required_people
          })),
          scheduleRules: {
            maxShiftsPerDay: 2,
            maxShiftsPerWeek: 10,
            minRestHours: 8
          },
          existingSchedules: existingSchedules.map(schedule => ({
            employee_name: schedule.employee?.name,
            date: schedule.schedule_date,
            time_slot_name: schedule.timeSlot?.name
          })),
          weekStart: currentWeekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          requirements: requirements,
          employeeNotes: employeeNotes,
          availability: availabilityData.availability
        }

        console.log('完整的AI排班数据:', JSON.stringify(scheduleData, null, 2))

        // 调用AI服务生成排班建议
        console.log('调用AI服务生成排班建议...')
        let aiResult
        try {
          // 传递用户ID用于进度推送
          const userId = req.user?.id || null
          aiResult = await aiService.generateScheduleSuggestions(scheduleData, userId)
        } catch (aiError) {
          console.error('AI服务调用失败:', aiError)
          errors.push({
            week: i + 1,
            weekStart: currentWeekStart.toISOString().split('T')[0],
            error: `AI服务调用失败: ${aiError.message}`
          })
          continue
        }
        
        console.log('AI服务返回结果:', {
          success: aiResult.success,
          suggestionCount: aiResult.suggestions?.length || 0,
          hasAnalysis: !!aiResult.analysis,
          hasConflicts: !!aiResult.conflicts,
          provider: aiResult.provider
        })

        if (aiResult.success && aiResult.suggestions && aiResult.suggestions.length > 0) {
          console.log('AI建议详情:', aiResult.suggestions)
          
          // 转换AI建议为标准排班格式
          const weekSchedules = aiResult.suggestions.map(suggestion => ({
            employee_id: suggestion.employee_id,
            employee_name: suggestion.employee_name,
            time_slot_id: suggestion.time_slot_id,
            time_slot_name: suggestion.time_slot_name,
            schedule_date: suggestion.date,
            week_start_date: currentWeekStart.toISOString().split('T')[0],
            status: 'scheduled',
            assigned_method: 'ai',
            ai_confidence: suggestion.confidence || 0.8,
            ai_reason: suggestion.reason || 'AI自动排班',
            notes: `AI排班 - ${suggestion.reason || '智能推荐'}`
          }))

          // 验证AI排班覆盖情况
          console.log('=== 验证AI排班覆盖情况 ===')
          const coverage = {}
          timeSlots.forEach(slot => {
            for (let d = 0; d < 7; d++) {
              const checkDate = new Date(currentWeekStart)
              checkDate.setDate(currentWeekStart.getDate() + d)
              const dateStr = checkDate.toISOString().split('T')[0]
              
              const key = `${dateStr}_${slot.id}`
              const assigned = weekSchedules.filter(s => 
                s.schedule_date === dateStr && s.time_slot_id === slot.id
              )
              
              coverage[key] = {
                date: dateStr,
                time_slot_name: slot.name,
                time_slot_id: slot.id,
                required_people: slot.required_people,
                assigned_people: assigned.length,
                assignments: assigned.map(a => a.employee_name),
                sufficient: assigned.length >= slot.required_people
              }
            }
          })
          
          const insufficientCoverage = Object.values(coverage).filter(c => !c.sufficient)
          console.log('覆盖不足的时间段:', insufficientCoverage.length, '个')
          insufficientCoverage.forEach(c => {
            console.log(`  ${c.date} ${c.time_slot_name}: 需要${c.required_people}人，实际${c.assigned_people}人`)
          })

          results.push({
            week: i + 1,
            weekStart: currentWeekStart.toISOString().split('T')[0],
            schedules: weekSchedules,
            analysis: aiResult.analysis,
            conflicts: aiResult.conflicts || [],
            optimization_notes: aiResult.optimization_notes || [],
            coverage: coverage,
            insufficient_coverage: insufficientCoverage
          })
        } else {
          errors.push({
            week: i + 1,
            weekStart: currentWeekStart.toISOString().split('T')[0],
            error: aiResult.error || 'AI排班生成失败'
          })
        }
      } catch (weekError) {
        console.error(`第${i + 1}周排班失败:`, weekError)
        errors.push({
          week: i + 1,
          weekStart: new Date(weekStart).toISOString().split('T')[0],
          error: weekError.message
        })
      }
    }

    // 合并所有周的排班结果
    const allSchedules = results.reduce((acc, week) => {
      return acc.concat(week.schedules)
    }, [])

    console.log('=== AI排班最终结果 ===')
    console.log('成功处理的周数:', results.length)
    console.log('失败的周数:', errors.length)
    console.log('总排班建议数:', allSchedules.length)
    console.log('每周结果详情:', results.map(r => ({
      week: r.week,
      scheduleCount: r.schedules.length
    })))
    console.log('前3个排班建议:', allSchedules.slice(0, 3))

    const responseData = {
      success: true,
      message: `AI排班完成，共生成${allSchedules.length}个排班建议`,
      data: allSchedules,
      weekResults: results,
      errors: errors,
      summary: {
        totalWeeks: weekCount,
        successWeeks: results.length,
        failedWeeks: errors.length,
        totalSchedules: allSchedules.length
      }
    }

    console.log('最终响应数据:', JSON.stringify(responseData, null, 2))
    res.json(responseData)
  } catch (error) {
    console.error('AI自动排班失败:', error)
    res.status(500).json({
      success: false,
      message: 'AI自动排班失败',
      error: error.message
    })
  }
})

// 获取指定周的员工空闲时间数据
async function getWeekAvailabilityData(weekStart, weekEnd) {
  try {
    // 获取所有活跃员工
    const employees = await Employee.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'employee_no', 'position', 'experience_level', 'temporary_notes']
    })

    // 获取该周的员工空闲时间
    const availabilities = await Availability.findAll({
      where: {
        week_start_date: {
          [Op.between]: [
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
          ]
        },
        is_available: true
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'name']
        },
        {
          model: TimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time']
        }
      ]
    })

    // 组织空闲时间数据
    const availabilityMap = {}
    availabilities.forEach(avail => {
      const employeeId = avail.employee_id
      const timeSlotId = avail.time_slot_id
      
      if (!availabilityMap[employeeId]) {
        availabilityMap[employeeId] = {}
      }
      
      if (!availabilityMap[employeeId][timeSlotId]) {
        availabilityMap[employeeId][timeSlotId] = []
      }
      
      availabilityMap[employeeId][timeSlotId].push({
        date: avail.week_start_date,
        priority: avail.priority,
        notes: avail.notes
      })
    })

    return {
      employees: employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        employee_no: emp.employee_no,
        position: emp.position,
        experience_level: emp.experience_level || 1,
        status: emp.status,
        temporary_notes: emp.temporary_notes,
        availability: availabilityMap[emp.id] || {}
      })),
      availability: availabilityMap
    }
  } catch (error) {
    console.error('获取员工空闲时间数据失败:', error)
    throw error
  }
}

// 验证AI排班结果
router.post('/validate', async (req, res) => {
  try {
    const { schedules, rules } = req.body

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的排班数据'
      })
    }

    const validationResults = await aiService.validateScheduleSuggestions(schedules, rules || {})

    res.json({
      success: true,
      data: validationResults
    })
  } catch (error) {
    console.error('验证AI排班失败:', error)
    res.status(500).json({
      success: false,
      message: '验证失败',
      error: error.message
    })
  }
})

// 应用AI排班建议
router.post('/apply', async (req, res) => {
  try {
    console.log('=== 应用AI排班请求开始 ===')
    console.log('请求数据:', JSON.stringify(req.body, null, 2))
    
    const { schedules, overwriteExisting = false } = req.body

    if (!schedules || !Array.isArray(schedules)) {
      console.error('错误: 排班数据无效', { schedules, isArray: Array.isArray(schedules) })
      return res.status(400).json({
        success: false,
        message: '请提供有效的排班数据'
      })
    }
    
    console.log('排班数据验证通过, 共有', schedules.length, '个排班需要保存')

    // 检查是否有重复的排班建议
    const duplicateCheck = new Map()
    let duplicateCount = 0
    schedules.forEach((schedule, index) => {
      const key = `${schedule.employee_id}_${schedule.schedule_date}_${schedule.time_slot_id}`
      if (duplicateCheck.has(key)) {
        console.log(`发现重复排班建议 [${index}]:`, {
          employee_id: schedule.employee_id,
          schedule_date: schedule.schedule_date,
          time_slot_id: schedule.time_slot_id,
          previousIndex: duplicateCheck.get(key)
        })
        duplicateCount++
      } else {
        duplicateCheck.set(key, index)
      }
    })
    
    console.log('重复排班建议统计:', duplicateCount, '个')

    const results = []
    const errors = []
    const createdInThisBatch = new Map() // 跟踪本批次已创建的记录

    for (const scheduleData of schedules) {
      try {
        console.log('处理排班数据:', scheduleData)
        
        // 验证排班日期是否为工作日
        const scheduleDateTime = new Date(scheduleData.schedule_date)
        console.log('验证工作日:', {
          schedule_date: scheduleData.schedule_date,
          scheduleDateTime: scheduleDateTime.toISOString()
        })
        
        const isWorkDay = await settingsHelper.validateScheduleDate(scheduleDateTime)
        console.log('工作日验证结果:', isWorkDay)
        
        if (!isWorkDay) {
          console.log('跳过非工作日:', scheduleData.schedule_date)
          errors.push({
            data: scheduleData,
            error: '该日期不是工作日'
          })
          continue
        }

        // 检查是否有冲突的排班（检查员工+日期+时间段的完全重复）
        if (!overwriteExisting) {
          const batchKey = `${scheduleData.employee_id}_${scheduleData.schedule_date}_${scheduleData.time_slot_id}`
          
          console.log('检查冲突排班:', {
            employee_id: scheduleData.employee_id,
            schedule_date: scheduleData.schedule_date,
            time_slot_id: scheduleData.time_slot_id,
            overwriteExisting: overwriteExisting,
            batchKey: batchKey
          })
          
          // 先检查本批次是否已经创建了完全相同的记录（员工+日期+时间段）
          if (createdInThisBatch.has(batchKey)) {
            console.log('本批次已创建完全相同的排班记录:', createdInThisBatch.get(batchKey))
            errors.push({
              data: scheduleData,
              error: '该员工在此时间段已有排班(本批次内重复)'
            })
            continue
          }
          
          // 再检查数据库中是否存在完全相同的排班（员工+日期+时间段）
          const conflictSchedule = await Schedule.findOne({
            where: {
              employee_id: scheduleData.employee_id,
              schedule_date: scheduleData.schedule_date,
              time_slot_id: scheduleData.time_slot_id,
              status: { [Op.in]: ['scheduled', 'confirmed'] }
            }
          })

          console.log('数据库冲突检查结果:', {
            hasConflict: !!conflictSchedule,
            conflictSchedule: conflictSchedule ? {
              id: conflictSchedule.id,
              employee_id: conflictSchedule.employee_id,
              schedule_date: conflictSchedule.schedule_date,
              time_slot_id: conflictSchedule.time_slot_id,
              status: conflictSchedule.status,
              assigned_method: conflictSchedule.assigned_method
            } : null
          })

          if (conflictSchedule) {
            console.log('发现数据库排班冲突，跳过此记录')
            errors.push({
              data: scheduleData,
              error: '该员工在此时间段已有排班(数据库冲突)'
            })
            continue
          } else {
            console.log('无冲突，继续创建排班记录')
          }
        }

        // 处理AI置信度字段 - 确保是有效数值
        console.log('原始ai_confidence值:', scheduleData.ai_confidence, 'typeof:', typeof scheduleData.ai_confidence)
        
        let aiConfidence = scheduleData.ai_confidence
        
        // 更严格的数据清洗
        if (aiConfidence === null || aiConfidence === undefined || aiConfidence === '' || 
            isNaN(parseFloat(aiConfidence)) || parseFloat(aiConfidence) < 0) {
          console.log('ai_confidence无效，使用默认值0.8')
          aiConfidence = 0.8
        } else {
          aiConfidence = parseFloat(aiConfidence)
          if (aiConfidence > 1) {
            aiConfidence = 1.0
          }
        }
        
        console.log('处理后的ai_confidence值:', aiConfidence, 'typeof:', typeof aiConfidence)
        
        // 创建排班记录
        console.log('准备创建排班记录:', {
          employee_id: scheduleData.employee_id,
          time_slot_id: scheduleData.time_slot_id,
          week_start_date: scheduleData.week_start_date,
          schedule_date: scheduleData.schedule_date,
          status: 'scheduled',
          assigned_method: 'ai',
          ai_confidence: aiConfidence,
          ai_reason: scheduleData.ai_reason,
          notes: scheduleData.notes
        })
        
        const schedule = await Schedule.create({
          employee_id: scheduleData.employee_id,
          time_slot_id: scheduleData.time_slot_id,
          week_start_date: scheduleData.week_start_date,
          schedule_date: scheduleData.schedule_date,
          status: 'scheduled',
          assigned_method: 'ai',
          ai_confidence: aiConfidence,
          ai_reason: scheduleData.ai_reason,
          notes: scheduleData.notes
        })

        console.log('排班记录创建成功:', schedule.id)
        results.push(schedule)
        
        // 记录本批次已创建的排班（使用完整的key：员工+日期+时间段）
        const batchKey = `${scheduleData.employee_id}_${scheduleData.schedule_date}_${scheduleData.time_slot_id}`
        createdInThisBatch.set(batchKey, {
          schedule_id: schedule.id,
          employee_id: scheduleData.employee_id,
          schedule_date: scheduleData.schedule_date,
          time_slot_id: scheduleData.time_slot_id,
          created_at: new Date()
        })
      } catch (error) {
        errors.push({
          data: scheduleData,
          error: error.message
        })
      }
    }

    console.log('=== AI排班应用完成 ===')
    console.log('成功创建:', results.length, '个排班')
    console.log('失败:', errors.length, '个排班')
    console.log('错误详情:', errors)

    res.json({
      success: true,
      message: `AI排班应用完成，成功创建${results.length}个排班`,
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors
      }
    })
  } catch (error) {
    console.error('应用AI排班失败:', error)
    res.status(500).json({
      success: false,
      message: '应用AI排班失败',
      error: error.message
    })
  }
})

// 导出指定周次的排班表为Excel
router.get('/export/:weekStart', async (req, res) => {
  try {
    const { weekStart } = req.params
    
    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: '请提供周起始日期'
      })
    }

    console.log('=== 导出排班表请求 ===')
    console.log('周起始日期:', weekStart)

    // 计算周结束日期
    const startDate = new Date(weekStart)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    console.log('导出日期范围:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })

    // 获取该周的排班数据
    const schedules = await Schedule.findAll({
      where: {
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
          attributes: ['id', 'name', 'employee_no']
        },
        {
          model: TimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'name', 'start_time', 'end_time']
        }
      ],
      order: [['schedule_date', 'ASC'], ['time_slot_id', 'ASC']]
    })

    console.log('找到排班记录:', schedules.length, '条')

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该周没有找到排班数据'
      })
    }

    // 获取所有时间段作为行标题
    const timeSlots = await TimeSlot.findAll({
      where: { is_active: true },
      order: [['start_time', 'ASC']]
    })

    // 创建矩阵表格数据
    const matrixData = []
    
    // 表头：时间段 + 一周7天
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    
    // 为每个时间段创建一行
    timeSlots.forEach(timeSlot => {
      const row = {
        '时间段': timeSlot.name,
        '时间': `${timeSlot.start_time}-${timeSlot.end_time}`
      }
      
      // 为连续7天创建列（从startDate开始）
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        // 计算当前天的日期（从startDate开始，依次加天数）
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + dayIndex)
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // 获取星期几（0=周日，1=周一，...，6=周六）
        const dayOfWeek = currentDate.getDay()
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        const dayName = dayNames[dayOfWeek]
        
        // 查找该时间段该天的所有值班人
        const daySchedules = schedules.filter(schedule => 
          schedule.time_slot_id === timeSlot.id && 
          schedule.schedule_date === dateStr
        )
        
        // 提取值班人名，多人用换行分隔
        const employees = daySchedules.map(schedule => 
          schedule.employee ? schedule.employee.name : '未知员工'
        ).join('\n')
        
        row[dayName] = employees || ''
      }
      
      matrixData.push(row)
    })

    console.log('矩阵表格数据:', matrixData)

    // 创建工作簿
    const workbook = xlsx.utils.book_new()
    const worksheet = xlsx.utils.json_to_sheet(matrixData)

    // 动态设置列宽（前两列是时间段和时间，后续是星期几）
    if (matrixData.length > 0) {
      const firstRow = matrixData[0]
      const columnCount = Object.keys(firstRow).length
      const columnWidths = []
      
      // 前两列设置较宽
      columnWidths.push({ wch: 20 }) // 时间段
      columnWidths.push({ wch: 15 }) // 时间
      
      // 其他列（星期几）设置标准宽度
      for (let i = 2; i < columnCount; i++) {
        columnWidths.push({ wch: 12 })
      }
      
      worksheet['!cols'] = columnWidths
    }

    // 添加工作表到工作簿
    const sheetName = `排班表_${moment(weekStart).format('YYYY年MM月DD日')}周`
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName)

    // 生成Excel文件缓冲区
    const excelBuffer = xlsx.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // 设置响应头
    const fileName = `排班表_${moment(weekStart).format('YYYY年MM月DD日')}周.xlsx`
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    console.log('Excel文件生成成功:', fileName)

    // 发送文件
    res.send(excelBuffer)

  } catch (error) {
    console.error('导出排班表失败:', error)
    res.status(500).json({
      success: false,
      message: '导出排班表失败',
      error: error.message
    })
  }
})

module.exports = router