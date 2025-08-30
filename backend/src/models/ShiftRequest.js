const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const ShiftRequest = sequelize.define('ShiftRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '申请ID'
  },
  requester_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '申请人 ID',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  original_schedule_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '原排班记录ID',
    references: {
      model: 'schedules',
      key: 'id'
    }
  },
  target_employee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '目标员工ID(换班)',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  target_time_slot_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '目标时间段ID(调班)',
    references: {
      model: 'time_slots',
      key: 'id'
    }
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '目标日期(调班)'
  },
  request_type: {
    type: DataTypes.ENUM('swap', 'transfer', 'cancel'),
    allowNull: false,
    comment: '申请类型:换班/转班/取消'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '申请原因'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '申请状态'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '审批人 ID',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '审批时间'
  },
  approval_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '审批备注'
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
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '软删除时间'
  }
}, {
  tableName: 'shift_requests',
  comment: '调班申请表',
  paranoid: true,
  deletedAt: 'deleted_at'
})

module.exports = ShiftRequest