const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const EmailTemplate = sequelize.define('EmailTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '模板名称'
  },
  subject: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '邮件主题模板'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '邮件内容模板'
  },
  variables: {
    type: DataTypes.JSON,
    comment: '可用变量说明'
  },
  event_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '邮件事件类型'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认模板'
  }
}, {
  tableName: 'email_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

module.exports = EmailTemplate