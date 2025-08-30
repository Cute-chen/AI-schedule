const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { Employee } = require('../models')
const { AppError, catchAsync } = require('../middleware/errorHandler')
const logger = require('../utils/logger')
const { sendPasswordResetEmail } = require('../utils/emailService')

/**
 * 生成JWT令牌
 * @param {number} userId - 用户ID
 * @param {string} role - 用户角色
 * @returns {string} JWT令牌
 */
const generateToken = (userId, role = 'employee') => {
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || 'fallback-secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'schedule-system',
      audience: 'schedule-system-users'
    }
  )
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {object} 解码后的令牌数据
 */
const verifyToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'fallback-secret',
    {
      issuer: 'schedule-system',
      audience: 'schedule-system-users'
    }
  )
}

/**
 * 发送token响应
 * @param {object} user - 用户对象
 * @param {number} statusCode - 状态码
 * @param {object} res - 响应对象
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.id, user.role)
  
  // 移除敏感信息
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    employee_no: user.employee_no,
    position: user.position,
    status: user.status,
    role: user.role || 'employee'
  }

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? '注册成功' : '登录成功',
    data: {
      token,
      user: userResponse,
      permissions: getUserPermissions(user.role || 'employee')
    }
  })
}

/**
 * 获取用户权限列表
 * @param {string} role - 用户角色
 * @returns {array} 权限列表
 */
const getUserPermissions = (role) => {
  const permissions = {
    admin: [
      'employee.create', 'employee.read', 'employee.update', 'employee.delete',
      'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete',
      'schedule.auto', 'schedule.approve',
      'statistics.read', 'settings.read', 'settings.update'
    ],
    employee: [
      'employee.read',
      'schedule.read',
      'availability.update',
      'shift-request.create', 'shift-request.read'
    ]
  }
  
  return permissions[role] || permissions.employee
}

/**
 * @desc    用户登录
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password, remember = false } = req.body

  // 查找用户
  const user = await Employee.findOne({
    where: { email, status: 'active' }
  })

  if (!user) {
    return next(new AppError('邮箱或密码不正确', 401))
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    logger.security('Failed login attempt', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    return next(new AppError('邮箱或密码不正确', 401))
  }

  // 记录登录日志
  logger.info('User logged in', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  })

  // 发送token响应
  sendTokenResponse(user, 200, res)
})

/**
 * @desc    用户注册（管理员创建）
 * @route   POST /api/auth/register
 * @access  Admin
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password, phone, position, role } = req.body

  // 检查邮箱是否已存在
  const existingUser = await Employee.findOne({ where: { email } })
  if (existingUser) {
    return next(new AppError('邮箱已被注册', 409))
  }

  // 哈希密码
  const hashedPassword = await bcrypt.hash(password, 12)

  // 创建用户
  const user = await Employee.create({
    name,
    email,
    phone,
    position,
    role: role || 'employee',
    password: hashedPassword,
    status: 'active',
    registration_type: 'admin_created',
    registration_status: 'approved'
  })

  // 记录注册日志
  logger.info('New user created by admin', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  })

  // 发送token响应
  sendTokenResponse(user, 201, res)
})

/**
 * @desc    员工自助注册
 * @route   POST /api/auth/self-register
 * @access  Public
 */
const selfRegister = catchAsync(async (req, res, next) => {
  const { name, email, password, phone, referrerEmail } = req.body

  // 检查邮箱是否已存在
  const existingUser = await Employee.findOne({ where: { email } })
  if (existingUser) {
    return next(new AppError('邮箱已被注册', 409))
  }

  // 验证推荐人
  const referrer = await Employee.findOne({ 
    where: { 
      email: referrerEmail, 
      status: 'active',
      registration_status: 'approved'
    } 
  })
  
  if (!referrer) {
    return next(new AppError('推荐人不存在或无效', 400))
  }

  // 哈希密码
  const hashedPassword = await bcrypt.hash(password, 12)

  // 生成员工编号
  const timestamp = Date.now().toString().slice(-6)
  const employee_no = `EMP${timestamp}`

  // 创建用户（待审核状态）
  const user = await Employee.create({
    employee_no,
    name,
    email,
    phone,
    password: hashedPassword,
    referrer_id: referrer.id,
    registration_type: 'self_registered',
    registration_status: 'pending',
    status: 'inactive' // 自助注册的用户初始状态为inactive，等待审核
  })

  // 记录注册日志
  logger.info('New self-registration request', {
    userId: user.id,
    email: user.email,
    referrerId: referrer.id,
    referrerEmail: referrer.email,
    ip: req.ip
  })

  res.status(201).json({
    success: true,
    message: '注册申请已提交，请等待管理员审核',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registration_status: user.registration_status
      },
      referrer: {
        id: referrer.id,
        name: referrer.name,
        email: referrer.email
      }
    }
  })
})

/**
 * @desc    验证推荐人
 * @route   POST /api/auth/validate-referrer
 * @access  Public
 */
const validateReferrer = catchAsync(async (req, res, next) => {
  const { email } = req.body

  if (!email) {
    return next(new AppError('请提供推荐人邮箱', 400))
  }

  // 查找推荐人
  const referrer = await Employee.findOne({ 
    where: { 
      email: email, 
      status: 'active',
      registration_status: 'approved'
    } 
  })

  if (!referrer) {
    return res.status(200).json({
      success: true,
      data: {
        valid: false,
        message: '推荐人不存在或无效'
      }
    })
  }

  res.status(200).json({
    success: true,
    data: {
      valid: true,
      employee: {
        id: referrer.id,
        name: referrer.name,
        email: referrer.email,
        position: referrer.position
      }
    }
  })
})

/**
 * @desc    获取当前用户信息
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res, next) => {
  const user = await Employee.findByPk(req.user.id)

  if (!user) {
    return next(new AppError('用户不存在', 404))
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employee_no: user.employee_no,
        position: user.position,
        status: user.status,
        role: user.role || 'employee'
      },
      permissions: getUserPermissions(user.role || 'employee')
    }
  })
})

/**
 * @desc    刷新访问令牌
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = catchAsync(async (req, res, next) => {
  const user = await Employee.findByPk(req.user.id)

  if (!user || user.status !== 'active') {
    return next(new AppError('用户不存在或已禁用', 404))
  }

  const newToken = generateToken(user.id, user.role)

  res.status(200).json({
    success: true,
    data: {
      token: newToken
    }
  })
})

/**
 * @desc    用户退出登录
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res, next) => {
  // 记录退出日志
  logger.info('User logged out', {
    userId: req.user.id,
    ip: req.ip
  })

  res.status(200).json({
    success: true,
    message: '退出登录成功'
  })
})

/**
 * @desc    忘记密码
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body

  const user = await Employee.findOne({ where: { email } })

  if (!user) {
    return next(new AppError('邮箱不存在', 404))
  }

  // 生成重置令牌
  const resetToken = jwt.sign(
    { userId: user.id, type: 'reset' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1h' }
  )

  try {
    // 发送重置邮件
    await sendPasswordResetEmail(user.email, resetToken, user.name)
    
    logger.info('Password reset email sent', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    })

    res.status(200).json({
      success: true,
      message: '密码重置邮件已发送，请查收您的邮箱',
      // 开发环境返回token，生产环境不返回
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    })
  } catch (emailError) {
    logger.error('Failed to send password reset email', {
      userId: user.id,
      email: user.email,
      error: emailError.message
    })
    
    return next(new AppError('邮件发送失败，请稍后重试', 500))
  }
})

/**
 * @desc    重置密码
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    
    if (decoded.type !== 'reset') {
      return next(new AppError('无效的重置令牌', 400))
    }

    const user = await Employee.findByPk(decoded.userId)

    if (!user) {
      return next(new AppError('用户不存在', 404))
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(password, 12)
    await user.update({ password: hashedPassword })

    logger.info('Password reset successfully', {
      userId: user.id,
      ip: req.ip
    })

    res.status(200).json({
      success: true,
      message: '密码重置成功'
    })
  } catch (error) {
    return next(new AppError('无效或已过期的重置令牌', 400))
  }
})

/**
 * @desc    修改密码
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body

  const user = await Employee.findByPk(req.user.id)

  if (!user) {
    return next(new AppError('用户不存在', 404))
  }

  // 验证当前密码
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    return next(new AppError('当前密码不正确', 400))
  }

  // 更新密码
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await user.update({ password: hashedPassword })

  logger.info('Password changed', {
    userId: user.id,
    ip: req.ip
  })

  res.status(200).json({
    success: true,
    message: '密码修改成功'
  })
})

/**
 * @desc    保护路由中间件
 * @access  Private
 */
const protect = catchAsync(async (req, res, next) => {
  // 获取token
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return next(new AppError('请先登录', 401))
  }

  // 验证token
  const decoded = verifyToken(token)

  // 检查用户是否仍然存在
  const user = await Employee.findByPk(decoded.userId)
  if (!user) {
    return next(new AppError('令牌所属用户不存在', 401))
  }

  // 检查用户状态
  if (user.status !== 'active') {
    return next(new AppError('账户已被禁用', 401))
  }

  // 将用户信息添加到请求对象
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'employee'
  }

  next()
})

/**
 * @desc    权限检查中间件
 * @param   {...string} roles - 允许的角色
 * @access  Private
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('权限不足', 403))
    }
    next()
  }
}

/**
 * @desc    审核注册申请
 * @route   POST /api/auth/approve-registration/:id
 * @access  Admin
 */
const approveRegistration = catchAsync(async (req, res, next) => {
  const { id } = req.params
  const { action, reason } = req.body // action: 'approve' or 'reject'

  if (!action || !['approve', 'reject'].includes(action)) {
    return next(new AppError('请提供有效的审核动作（approve 或 reject）', 400))
  }

  // 查找待审核的用户
  const user = await Employee.findOne({
    where: {
      id: id,
      registration_type: 'self_registered',
      registration_status: 'pending'
    },
    include: [{
      model: Employee,
      as: 'referrer',
      attributes: ['id', 'name', 'email'],
      required: false
    }]
  })

  if (!user) {
    return next(new AppError('找不到待审核的注册申请', 404))
  }

  // 更新用户状态
  if (action === 'approve') {
    await user.update({
      registration_status: 'approved',
      status: 'active'
    })
    
    logger.info('Registration approved', {
      userId: user.id,
      email: user.email,
      approvedBy: req.user.id,
      ip: req.ip
    })

    res.status(200).json({
      success: true,
      message: '注册申请已通过',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          registration_status: user.registration_status,
          status: user.status
        }
      }
    })
  } else {
    await user.update({
      registration_status: 'rejected'
    })
    
    logger.info('Registration rejected', {
      userId: user.id,
      email: user.email,
      reason: reason,
      rejectedBy: req.user.id,
      ip: req.ip
    })

    res.status(200).json({
      success: true,
      message: '注册申请已拒绝',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          registration_status: user.registration_status,
          reason: reason
        }
      }
    })
  }
})

/**
 * @desc    获取待审核的注册申请列表
 * @route   GET /api/auth/pending-registrations
 * @access  Admin
 */
const getPendingRegistrations = catchAsync(async (req, res, next) => {
  try {
    const pendingUsers = await Employee.findAll({
      where: {
        registration_type: 'self_registered',
        registration_status: 'pending'
      },
      include: [{
        model: Employee,
        as: 'referrer',
        attributes: ['id', 'name', 'email', 'position'],
        required: false
      }],
      attributes: [
        'id', 'name', 'email', 'phone', 'position', 
        'registration_type', 'registration_status', 'created_at', 'referrer_id'
      ],
      order: [['created_at', 'DESC']]
    })

    res.status(200).json({
      success: true,
      data: {
        pendingRegistrations: pendingUsers,
        count: pendingUsers.length
      }
    })
  } catch (error) {
    logger.error('Get pending registrations error:', error)
    
    // 如果是关联问题，回退到不包含referrer信息的查询
    try {
      const pendingUsersWithoutReferrer = await Employee.findAll({
        where: {
          registration_type: 'self_registered',
          registration_status: 'pending'
        },
        attributes: [
          'id', 'name', 'email', 'phone', 'position', 
          'registration_type', 'registration_status', 'created_at', 'referrer_id'
        ],
        order: [['created_at', 'DESC']]
      })

      // 手动获取推荐人信息
      for (const user of pendingUsersWithoutReferrer) {
        if (user.referrer_id) {
          try {
            const referrer = await Employee.findByPk(user.referrer_id, {
              attributes: ['id', 'name', 'email', 'position']
            })
            user.dataValues.referrer = referrer
          } catch (refError) {
            logger.warn('Failed to fetch referrer for user:', user.id, refError)
            user.dataValues.referrer = null
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          pendingRegistrations: pendingUsersWithoutReferrer,
          count: pendingUsersWithoutReferrer.length
        }
      })
    } catch (fallbackError) {
      logger.error('Fallback query also failed:', fallbackError)
      return next(new AppError('获取待审核注册申请失败', 500))
    }
  }
})

module.exports = {
  login,
  register,
  selfRegister,
  validateReferrer,
  approveRegistration,
  getPendingRegistrations,
  getMe,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  protect,
  restrictTo,
  generateToken,
  verifyToken
}