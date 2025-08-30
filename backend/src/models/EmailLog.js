const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const EmailLog = sequelize.define('EmailLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '邮件日志ID'
  },
  recipient_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '收件人邮箱'
  },
  recipient_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '收件人姓名'
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '邮件主题'
  },
  template_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '邮件模板名称'
  },
  template_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模板数据'
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'retry'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '发送状态'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发送时间'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '重试次数'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '创庺时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  }
}, {
  tableName: 'email_logs',
  comment: '邮件发送日志表'
})

module.exports = EmailLog