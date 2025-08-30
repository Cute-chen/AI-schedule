const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const BatchOperation = sequelize.define('BatchOperation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '操作ID'
  },
  operation_type: {
    type: DataTypes.ENUM('schedule', 'availability', 'adjustment'),
    allowNull: false,
    comment: '操作类型'
  },
  operation_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '操作名称'
  },
  target_weeks: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '目标周次 [1,2,3,4,5,6,7,8]'
  },
  operation_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '操作数据'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '操作状态'
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '操作进度百分比'
  },
  result_summary: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '操作结果摘要'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建人ID',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始时间'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
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
  tableName: 'batch_operations',
  comment: '批量操作记录表'
})

module.exports = BatchOperation