const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Availability = sequelize.define('Availability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '空闲时间ID'
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
  is_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否有空'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '优先级'
  },
  start_week_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '适用周期开始日期'
  },
  end_week_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '适用周期结束日期'
  },
  applies_to_weeks: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '适用的周次列表 [1,2,3,4,5,6,7,8]'
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
  tableName: 'availability',
  comment: '员工空闲时间表'
})

module.exports = Availability