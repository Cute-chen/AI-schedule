const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '排班ID'
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '员工ID',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  time_slot_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '时间段ID',
    references: {
      model: 'time_slots',
      key: 'id'
    }
  },
  week_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '周开始日期(周一)'
  },
  schedule_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '排班日期'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled',
    comment: '排班状态'
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分配人员ID',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  assigned_method: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'manual',
    comment: '分配方式: manual(手动), ai(AI推荐)'
  },
  ai_confidence: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    comment: 'AI排班置信度(0-1)'
    // 临时移除验证
  },
  ai_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI推荐理由'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  }
}, {
  tableName: 'schedules',
  comment: '排班结果表'
})

module.exports = Schedule