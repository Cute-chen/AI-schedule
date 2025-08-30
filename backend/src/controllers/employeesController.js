const bcrypt = require('bcryptjs')
const { Employee } = require('../models')
const { AppError, catchAsync } = require('../middleware/errorHandler')
const logger = require('../utils/logger')
const { Op } = require('sequelize')

/**
 * @desc    获取员工列表
 * @route   GET /api/employees
 * @access  Admin/Employee
 */
const getEmployees = catchAsync(async (req, res, next) => {
  const { page = 1, size = 50, search, status } = req.query
  const offset = (page - 1) * size

  // 构建查询条件
  const whereClause = {}
  
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { employee_no: { [Op.like]: `%${search}%` } }
    ]
  }
  
  if (status) {
    whereClause.status = status
  }

  const { count, rows: employees } = await Employee.findAndCountAll({
    where: whereClause,
    include: [{
      model: Employee,
      as: 'referrer',
      attributes: ['id', 'name', 'email']
    }],
    attributes: { exclude: ['password'] },
    limit: parseInt(size),
    offset: offset,
    order: [['created_at', 'DESC']]
  })

  res.status(200).json({
    success: true,
    data: employees,
    pagination: {
      page: parseInt(page),
      size: parseInt(size),
      total: count,
      totalPages: Math.ceil(count / size)
    }
  })
})

/**
 * @desc    创建员工
 * @route   POST /api/employees
 * @access  Admin
 */
const createEmployee = catchAsync(async (req, res, next) => {
  const { name, email, password, phone, position, role } = req.body

  // 检查邮箱是否已存在
  const existingEmployee = await Employee.findOne({ where: { email } })
  if (existingEmployee) {
    return next(new AppError('邮箱已被使用', 409))
  }

  // 设置默认密码
  const finalPassword = password || '123456'
  const hashedPassword = await bcrypt.hash(finalPassword, 12)

  const employee = await Employee.create({
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

  logger.info('Employee created', {
    employeeId: employee.id,
    email: employee.email,
    createdBy: req.user.id,
    ip: req.ip
  })

  // 返回不包含密码的员工信息
  const { password: _, ...employeeData } = employee.toJSON()

  res.status(201).json({
    success: true,
    message: '员工创建成功',
    data: employeeData
  })
})

/**
 * @desc    更新员工
 * @route   PUT /api/employees/:id
 * @access  Admin
 */
const updateEmployee = catchAsync(async (req, res, next) => {
  const { id } = req.params
  const updateData = req.body

  // 移除敏感字段
  delete updateData.password
  delete updateData.referrer_id
  delete updateData.registration_type

  const employee = await Employee.findByPk(id)
  
  if (!employee) {
    return next(new AppError('员工不存在', 404))
  }

  // 如果要更新邮箱，检查是否重复
  if (updateData.email && updateData.email !== employee.email) {
    const existingEmployee = await Employee.findOne({ 
      where: { 
        email: updateData.email,
        id: { [Op.ne]: id }
      } 
    })
    if (existingEmployee) {
      return next(new AppError('邮箱已被使用', 409))
    }
  }

  await employee.update(updateData)

  logger.info('Employee updated', {
    employeeId: employee.id,
    updatedBy: req.user.id,
    changes: updateData,
    ip: req.ip
  })

  // 返回不包含密码的员工信息
  const { password: _, ...employeeData } = employee.toJSON()

  res.status(200).json({
    success: true,
    message: '员工信息更新成功',
    data: employeeData
  })
})

/**
 * @desc    删除员工
 * @route   DELETE /api/employees/:id
 * @access  Admin
 */
const deleteEmployee = catchAsync(async (req, res, next) => {
  const { id } = req.params

  const employee = await Employee.findByPk(id)
  
  if (!employee) {
    return next(new AppError('员工不存在', 404))
  }

  // 不能删除自己
  if (employee.id === req.user.id) {
    return next(new AppError('不能删除自己的账户', 400))
  }

  // 检查员工状态，只能删除inactive状态的员工
  if (employee.status === 'active') {
    return next(new AppError('只能删除已停用的员工', 400))
  }

  await employee.destroy()

  logger.info('Employee deleted', {
    employeeId: id,
    employeeEmail: employee.email,
    deletedBy: req.user.id,
    ip: req.ip
  })

  res.status(200).json({
    success: true,
    message: '员工已删除'
  })
})

/**
 * @desc    验证推荐人
 * @route   POST /api/employees/validate-referrer
 * @access  Public
 */
const validateReferrer = catchAsync(async (req, res, next) => {
  const { email } = req.body

  if (!email) {
    return next(new AppError('请提供推荐人邮箱', 400))
  }

  const referrer = await Employee.findOne({ 
    where: { 
      email: email, 
      status: 'active',
      registration_status: 'approved'
    },
    attributes: ['id', 'name', 'email', 'position']
  })

  res.status(200).json({
    success: true,
    data: {
      valid: !!referrer,
      employee: referrer || null,
      message: referrer ? '推荐人验证成功' : '推荐人不存在或无效'
    }
  })
})

/**
 * @desc    获取推荐关系统计（管理员）
 * @route   GET /api/employees/referral-stats
 * @access  Admin
 */
const getReferralStats = catchAsync(async (req, res, next) => {
  // 获取所有员工的推荐信息（包括管理员创建和自助注册已通过审核的员工）
  const employees = await Employee.findAll({
    where: {
      status: 'active',
      registration_status: 'approved'
    },
    include: [{
      model: Employee,
      as: 'referredEmployees',
      where: {
        registration_type: 'self_registered',
        registration_status: 'approved'
      },
      required: false,
      include: [{
        model: Employee,
        as: 'referrer',
        attributes: ['id', 'name', 'email']
      }]
    }],
    attributes: ['id', 'name', 'email', 'position', 'registration_type'],
    order: [['name', 'ASC']]
  })

  const referralData = employees.map(employee => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    position: employee.position,
    referredCount: employee.referredEmployees ? employee.referredEmployees.length : 0,
    referredEmployees: employee.referredEmployees ? employee.referredEmployees.map(referred => ({
      id: referred.id,
      name: referred.name,
      email: referred.email,
      registration_status: referred.registration_status,
      created_at: referred.created_at
    })) : []
  }))

  // 禁用缓存确保数据更新
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  
  res.status(200).json({
    success: true,
    data: {
      employees: referralData,
      totalEmployees: employees.length,
      totalReferrals: referralData.reduce((sum, emp) => sum + emp.referredCount, 0)
    }
  })
})

/**
 * @desc    获取员工的推荐信息（员工自己）
 * @route   GET /api/employees/my-referrals
 * @access  Employee
 */
const getMyReferrals = catchAsync(async (req, res, next) => {
  const employee = await Employee.findByPk(req.user.id, {
    include: [{
      model: Employee,
      as: 'referredEmployees',
      where: {
        registration_type: 'self_registered'
      },
      required: false,
      attributes: ['id', 'name', 'email', 'registration_status', 'status', 'created_at']
    }, {
      model: Employee,
      as: 'referrer',
      attributes: ['id', 'name', 'email']
    }],
    attributes: { exclude: ['password'] }
  })

  if (!employee) {
    return next(new AppError('员工不存在', 404))
  }

  const referralInfo = {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      registration_type: employee.registration_type
    },
    referrer: employee.referrer,
    referredEmployees: employee.referredEmployees || [],
    referredCount: employee.referredEmployees ? employee.referredEmployees.length : 0
  }

  res.status(200).json({
    success: true,
    data: referralInfo
  })
})

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  validateReferrer,
  getReferralStats,
  getMyReferrals
}