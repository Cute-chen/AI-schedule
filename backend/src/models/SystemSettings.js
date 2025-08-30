const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category: {
    type: DataTypes.ENUM('general', 'schedule', 'notification', 'ai'),
    allowNull: false,
    comment: '设置类别'
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '设置键名'
  },
  value: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '设置值(JSON格式)'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '设置描述'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['category', 'key']
    }
  ]
})

module.exports = SystemSettings