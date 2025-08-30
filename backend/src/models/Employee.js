const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

/**
 * 员工模型
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - employee_no
 *         - name
 *         - email
 *         - phone
 *       properties:
 *         id:
 *           type: integer
 *           description: 员工ID
 *         employee_no:
 *           type: string
 *           description: 员工编号
 *         name:
 *           type: string
 *           description: 员工姓名
 *         email:
 *           type: string
 *           format: email
 *           description: 员工邮箱
 *         phone:
 *           type: string
 *           description: 手机号码
 *           required: true
 *         position:
 *           type: string
 *           description: 角色
 *         hire_date:
 *           type: string
 *           format: date
 *           description: 入职日期
 *         status:
 *           type: string
 *           enum: [active, inactive, leave]
 *           description: 员工状态
 *         role:
 *           type: string
 *           enum: [admin, employee]
 *           description: 员工角色
 *         max_shifts_per_week:
 *           type: integer
 *           description: 每周最大班次数
 *         max_shifts_per_day:
 *           type: integer
 *           description: 每日最大班次数
 */
const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '员工ID'
  },
  employee_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '员工编号',
    validate: {
      notEmpty: {
        msg: '员工编号不能为空'
      },
      len: {
        args: [3, 50],
        msg: '员工编号长度应在3-50个字符之间'
      }
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '员工姓名',
    validate: {
      notEmpty: {
        msg: '员工姓名不能为空'
      },
      len: {
        args: [2, 100],
        msg: '员工姓名长度应在2-100个字符之间'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: '员工邮箱',
    validate: {
      isEmail: {
        msg: '请输入有效的邮箱地址'
      },
      notEmpty: {
        msg: '邮箱不能为空'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码(加密)',
    validate: {
      notEmpty: {
        msg: '密码不能为空'
      },
      len: {
        args: [6, 255],
        msg: '密码长度应在6-255个字符之间'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '手机号码',
    validate: {
      notEmpty: {
        msg: '手机号码不能为空'
      },
      is: {
        args: /^1[3-9]\d{9}$/,
        msg: '请输入有效的手机号码'
      }
    }
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '角色'
  },
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '入职日期',
    validate: {
      isDate: {
        msg: '请输入有效的入职日期'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'leave'),
    allowNull: false,
    defaultValue: 'active',
    comment: '员工状态'
  },
  role: {
    type: DataTypes.ENUM('admin', 'employee'),
    allowNull: false,
    defaultValue: 'employee',
    comment: '员工角色'
  },
  max_shifts_per_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '每周最大班次数',
    validate: {
      min: {
        args: 1,
        msg: '每周最大班次数不能少于1'
      },
      max: {
        args: 7,
        msg: '每周最大班次数不能超过7'
      }
    }
  },
  max_shifts_per_day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '每日最大班次数',
    validate: {
      min: {
        args: 1,
        msg: '每日最大班次数不能少于1'
      },
      max: {
        args: 3,
        msg: '每日最大班次数不能超过3'
      }
    }
  },
  experience_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '经验等级(1-5)',
    validate: {
      min: {
        args: 1,
        msg: '经验等级不能少于1'
      },
      max: {
        args: 5,
        msg: '经验等级不能超过5'
      }
    }
  },
  temporary_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '临时排班备注'
  },
  referrer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '推荐人ID（如果是通过同事推荐注册的）'
  },
  registration_type: {
    type: DataTypes.ENUM('admin_created', 'self_registered'),
    allowNull: false,
    defaultValue: 'admin_created',
    comment: '注册类型：admin_created-管理员创建，self_registered-自助注册'
  },
  registration_status: {
    type: DataTypes.ENUM('approved', 'pending', 'rejected'),
    allowNull: false,
    defaultValue: 'approved',
    comment: '注册审核状态：approved-已通过，pending-待审核，rejected-已拒绝'
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
  tableName: 'employees',
  comment: '员工信息表',
  hooks: {
    // 创建前钩子
    beforeCreate: (employee) => {
      // 自动生成员工编号（如果未提供）
      if (!employee.employee_no) {
        const timestamp = Date.now().toString().slice(-6)
        employee.employee_no = `EMP${timestamp}`
      }
    },
    
    // 更新前钩子
    beforeUpdate: (employee) => {
      // 更新时间
      employee.updated_at = new Date()
    }
  }
})

// 实例方法
Employee.prototype.getFullInfo = function() {
  return {
    id: this.id,
    employee_no: this.employee_no,
    name: this.name,
    email: this.email,
    phone: this.phone,
    position: this.position,
    status: this.status,
    role: this.role
  }
}

// 类方法
Employee.findActive = function() {
  return this.findAll({
    where: {
      status: 'active'
    }
  })
}


Employee.search = function(keyword) {
  const { Op } = require('sequelize')
  return this.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${keyword}%` } },
        { employee_no: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } }
      ]
    }
  })
}

// 关联定义已在models/index.js中统一设置，避免重复定义
// Employee.associate = (models) => {
//   Employee.hasMany(models.Availability, {
//     foreignKey: 'employee_id',
//     as: 'availability'
//   })
//   
//   Employee.hasMany(models.Schedule, {
//     foreignKey: 'employee_id',
//     as: 'schedules'
//   })
//   
//   Employee.hasMany(models.ShiftRequest, {
//     foreignKey: 'requester_id',
//     as: 'shiftRequests'
//   })
//   
//   // 推荐人关系：员工可以有一个推荐人
//   Employee.belongsTo(models.Employee, {
//     foreignKey: 'referrer_id',
//     as: 'referrer'
//   })
//   
//   // 被推荐人关系：员工可以推荐多个人
//   Employee.hasMany(models.Employee, {
//     foreignKey: 'referrer_id',
//     as: 'referredEmployees'
//   })
// }

module.exports = Employee