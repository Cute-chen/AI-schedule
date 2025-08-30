const { Sequelize, sequelize } = require('../config/database')

// 模型文件映射
const models = {}

// 导入所有模型
models.Employee = require('./Employee')
models.TimeSlot = require('./TimeSlot')
models.Availability = require('./Availability')
models.BatchOperation = require('./BatchOperation')
models.ScheduleRule = require('./ScheduleRule')
models.Schedule = require('./Schedule')
models.ShiftRequest = require('./ShiftRequest')
models.EmailLog = require('./EmailLog')
models.SystemSettings = require('./SystemSettings')
models.EmailTemplate = require('./EmailTemplate')

// 建立模型关联关系
const setupAssociations = () => {
  const { Employee, TimeSlot, Availability, BatchOperation, Schedule, ShiftRequest } = models

  // 员工与空闲时间 (一对多)
  Employee.hasMany(Availability, {
    foreignKey: 'employee_id',
    as: 'availability'
  })
  Availability.belongsTo(Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  })

  // 时间段与空闲时间 (一对多)
  TimeSlot.hasMany(Availability, {
    foreignKey: 'time_slot_id',
    as: 'availability'
  })
  Availability.belongsTo(TimeSlot, {
    foreignKey: 'time_slot_id',
    as: 'timeSlot'
  })

  // 员工与排班 (一对多)
  Employee.hasMany(Schedule, {
    foreignKey: 'employee_id',
    as: 'schedules'
  })
  Schedule.belongsTo(Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  })

  // 时间段与排班 (一对多)
  TimeSlot.hasMany(Schedule, {
    foreignKey: 'time_slot_id',
    as: 'schedules'
  })
  Schedule.belongsTo(TimeSlot, {
    foreignKey: 'time_slot_id',
    as: 'timeSlot'
  })

  // 排班分配人关联
  Employee.hasMany(Schedule, {
    foreignKey: 'assigned_by',
    as: 'assignedSchedules'
  })
  Schedule.belongsTo(Employee, {
    foreignKey: 'assigned_by',
    as: 'assignedBy'
  })

  // 员工与调班申请 (申请人)
  Employee.hasMany(ShiftRequest, {
    foreignKey: 'requester_id',
    as: 'shiftRequests'
  })
  ShiftRequest.belongsTo(Employee, {
    foreignKey: 'requester_id',
    as: 'requester'
  })

  // 排班与调班申请 (一对多)
  Schedule.hasMany(ShiftRequest, {
    foreignKey: 'original_schedule_id',
    as: 'shiftRequests'
  })
  ShiftRequest.belongsTo(Schedule, {
    foreignKey: 'original_schedule_id',
    as: 'originalSchedule'
  })

  // 目标员工关联
  Employee.hasMany(ShiftRequest, {
    foreignKey: 'target_employee_id',
    as: 'targetShiftRequests'
  })
  ShiftRequest.belongsTo(Employee, {
    foreignKey: 'target_employee_id',
    as: 'targetEmployee'
  })

  // 目标时间段关联
  TimeSlot.hasMany(ShiftRequest, {
    foreignKey: 'target_time_slot_id',
    as: 'targetShiftRequests'
  })
  ShiftRequest.belongsTo(TimeSlot, {
    foreignKey: 'target_time_slot_id',
    as: 'targetTimeSlot'
  })

  // 审批人关联
  Employee.hasMany(ShiftRequest, {
    foreignKey: 'approved_by',
    as: 'approvedRequests'
  })
  ShiftRequest.belongsTo(Employee, {
    foreignKey: 'approved_by',
    as: 'approvedBy'
  })


  // 员工与批量操作 (一对多)
  Employee.hasMany(BatchOperation, {
    foreignKey: 'created_by',
    as: 'batchOperations'
  })
  BatchOperation.belongsTo(Employee, {
    foreignKey: 'created_by',
    as: 'creator'
  })

  // 员工推荐关系（自引用）
  Employee.belongsTo(Employee, {
    foreignKey: 'referrer_id',
    as: 'referrer'
  })
  Employee.hasMany(Employee, {
    foreignKey: 'referrer_id',
    as: 'referredEmployees'
  })
}

// 设置关联关系
setupAssociations()

// 导出所有模型和Sequelize实例
module.exports = {
  ...models,
  sequelize,
  Sequelize
}