const { validationResult } = require('express-validator')
const { validationError } = require('./errorHandler')

/**
 * 验证中间件
 * 检查express-validator的验证结果
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value,
      location: err.location
    }))
    
    return next(validationError(extractedErrors))
  }
  
  next()
}

/**
 * 自定义验证器
 */
const customValidators = {
  // 验证中国手机号码
  isChinaMobile: (value) => {
    const regex = /^1[3-9]\d{9}$/
    return regex.test(value)
  },
  
  // 验证员工编号格式
  isEmployeeNo: (value) => {
    const regex = /^EMP\d{6}$/
    return regex.test(value)
  },
  
  // 验证日期范围
  isDateRange: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return start <= end
  },
  
  // 验证时间格式 (HH:mm)
  isTimeFormat: (value) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return regex.test(value)
  },
  
  // 验证星期几 (1-7)
  isDayOfWeek: (value) => {
    const day = parseInt(value)
    return day >= 1 && day <= 7
  },
  
  // 验证排班状态
  isScheduleStatus: (value) => {
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled']
    return validStatuses.includes(value)
  },
  
  // 验证调班申请类型
  isShiftRequestType: (value) => {
    const validTypes = ['swap', 'transfer', 'cancel']
    return validTypes.includes(value)
  },
  
  // 验证员工状态
  isEmployeeStatus: (value) => {
    const validStatuses = ['active', 'inactive', 'leave']
    return validStatuses.includes(value)
  },
  
  // 验证用户角色
  isUserRole: (value) => {
    const validRoles = ['admin', 'manager', 'employee']
    return validRoles.includes(value)
  }
}

/**
 * 通用验证规则
 */
const commonRules = {
  // ID验证
  id: {
    in: ['params'],
    isInt: {
      options: { min: 1 },
      errorMessage: 'ID必须是大于0的整数'
    }
  },
  
  // 分页验证
  page: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: '页码必须是大于0的整数'
    },
    toInt: true
  },
  
  limit: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: '每页数量必须是1-100之间的整数'
    },
    toInt: true
  },
  
  // 排序验证
  sort: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: '排序字段必须是字符串'
    }
  },
  
  order: {
    in: ['query'],
    optional: true,
    isIn: {
      options: [['ASC', 'DESC', 'asc', 'desc']],
      errorMessage: '排序方向必须是ASC或DESC'
    }
  },
  
  // 搜索验证
  search: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: '搜索关键词必须是字符串'
    },
    trim: true
  }
}

/**
 * 员工相关验证规则
 */
const employeeRules = {
  name: {
    in: ['body'],
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: '员工姓名长度应在2-100个字符之间'
    },
    trim: true
  },
  
  email: {
    in: ['body'],
    isEmail: {
      errorMessage: '请输入有效的邮箱地址'
    },
    normalizeEmail: true
  },
  
  phone: {
    in: ['body'],
    optional: true,
    custom: {
      options: customValidators.isChinaMobile,
      errorMessage: '请输入有效的手机号码'
    }
  },
  
  employee_no: {
    in: ['body'],
    optional: true,
    custom: {
      options: customValidators.isEmployeeNo,
      errorMessage: '员工编号格式不正确'
    }
  },
  
  department_id: {
    in: ['body'],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: '部门ID必须是大于0的整数'
    }
  },
  
  status: {
    in: ['body'],
    optional: true,
    custom: {
      options: customValidators.isEmployeeStatus,
      errorMessage: '员工状态不正确'
    }
  }
}

/**
 * 时间段验证规则
 */
const timeSlotRules = {
  name: {
    in: ['body'],
    isLength: {
      options: { min: 2, max: 50 },
      errorMessage: '时间段名称长度应在2-50个字符之间'
    },
    trim: true
  },
  
  day_of_week: {
    in: ['body'],
    custom: {
      options: customValidators.isDayOfWeek,
      errorMessage: '星期几必须是1-7之间的整数'
    }
  },
  
  start_time: {
    in: ['body'],
    custom: {
      options: customValidators.isTimeFormat,
      errorMessage: '开始时间格式不正确'
    }
  },
  
  end_time: {
    in: ['body'],
    custom: {
      options: customValidators.isTimeFormat,
      errorMessage: '结束时间格式不正确'
    }
  },
  
  required_people: {
    in: ['body'],
    isInt: {
      options: { min: 1 },
      errorMessage: '需要人数必须是大于0的整数'
    }
  }
}

/**
 * 排班验证规则
 */
const scheduleRules = {
  employee_id: {
    in: ['body'],
    isInt: {
      options: { min: 1 },
      errorMessage: '员工ID必须是大于0的整数'
    }
  },
  
  time_slot_id: {
    in: ['body'],
    isInt: {
      options: { min: 1 },
      errorMessage: '时间段ID必须是大于0的整数'
    }
  },
  
  schedule_date: {
    in: ['body'],
    isDate: {
      errorMessage: '排班日期格式不正确'
    }
  },
  
  status: {
    in: ['body'],
    optional: true,
    custom: {
      options: customValidators.isScheduleStatus,
      errorMessage: '排班状态不正确'
    }
  }
}

module.exports = {
  validate,
  customValidators,
  commonRules,
  employeeRules,
  timeSlotRules,
  scheduleRules
}