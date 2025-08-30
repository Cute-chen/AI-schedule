const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const ScheduleRule = sequelize.define('ScheduleRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '规则ID'
  },
  rule_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '规则名称'
  },
  rule_type: {
    type: DataTypes.ENUM('max_shifts_per_day', 'max_shifts_per_week', 'min_rest_hours', 'fairness_weight', 'priority_rule'),
    allowNull: false,
    comment: '规则类型'
  },
  rule_value: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '规则值(JSON格式)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '规则优先级'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '规则描述'
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
  tableName: 'schedule_rules',
  comment: '排班规则配置表'
})

module.exports = ScheduleRule