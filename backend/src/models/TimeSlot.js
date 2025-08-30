const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const TimeSlot = sequelize.define('TimeSlot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '时间段ID'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '时间段名称'
  },
  day_of_week: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '星期几(1=周一,7=周日,null=通用)',
    validate: {
      min: 1,
      max: 7
    }
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '开始时间'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '结束时间'
  },
  required_people: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '需要人数'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用'
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
  tableName: 'time_slots',
  comment: '时间段配置表'
})

module.exports = TimeSlot