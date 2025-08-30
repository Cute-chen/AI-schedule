const express = require('express')
const { Op } = require('sequelize')
const { Employee } = require('../models')
const bcrypt = require('bcryptjs')
const { protect, restrictTo } = require('../controllers/authController')
const router = express.Router()

// 验证推荐人 - 公开路由，不需要认证
router.post('/validate-referrer', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '请提供推荐人邮箱'
      })
    }

    const referrer = await Employee.findOne({ 
      where: { 
        email: email, 
        status: 'active',
        registration_status: 'approved'
      },
      attributes: ['id', 'name', 'email', 'position']
    })

    res.json({
      success: true,
      data: {
        valid: !!referrer,
        employee: referrer || null,
        message: referrer ? '推荐人验证成功' : '推荐人不存在或无效'
      }
    })
  } catch (error) {
    console.error('验证推荐人失败:', error)
    res.status(500).json({
      success: false,
      message: '验证推荐人失败',
      error: error.message
    })
  }
})

// 应用认证中间件到其他路由
router.use(protect)

// 获取员工列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      name, 
      status,
      employee_no
    } = req.query

    const offset = (page - 1) * size
    const limit = parseInt(size)

    // 构建查询条件
    const where = {}
    if (name) {
      where.name = { [Op.like]: `%${name}%` }
    }
    if (employee_no) {
      where.employee_no = { [Op.like]: `%${employee_no}%` }
    }
    if (status) {
      where.status = status
    }


    const { count, rows } = await Employee.findAndCountAll({
      where,
      offset,
      limit,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password'] }
    })

    res.json({
      success: true,
      data: rows, // 直接返回员工数组，兼容前端
      pagination: {
        total: count,
        page: parseInt(page),
        size: limit
      }
    })
  } catch (error) {
    console.error('获取员工列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取员工列表失败',
      error: error.message
    })
  }
})

// 获取推荐关系统计（管理员）
router.get('/referral-stats', restrictTo('admin'), async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: {
        employees: referralData,
        totalEmployees: employees.length,
        totalReferrals: referralData.reduce((sum, emp) => sum + emp.referredCount, 0)
      }
    })
  } catch (error) {
    console.error('获取推荐统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取推荐统计失败',
      error: error.message
    })
  }
})

// 获取员工的推荐信息（员工自己）
router.get('/my-referrals', async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
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

    res.json({
      success: true,
      data: referralInfo
    })
  } catch (error) {
    console.error('获取个人推荐信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取个人推荐信息失败',
      error: error.message
    })
  }
})

// 获取单个员工
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const employee = await Employee.findByPk(id, {
      attributes: { exclude: ['password'] }
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    res.json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('获取员工详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取员工详情失败',
      error: error.message
    })
  }
})

// 创建员工 (仅管理员)
router.post('/', restrictTo('admin'), async (req, res) => {
  try {
    const {
      employee_no,
      name,
      email,
      password,
      phone,
      role,
      hire_date,
      max_shifts_per_week,
      max_shifts_per_day
    } = req.body

    // 检查邮箱是否已存在
    const existingEmployee = await Employee.findOne({ where: { email } })
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: '邮箱已存在'
      })
    }

    // 检查员工编号是否已存在（如果提供）
    if (employee_no) {
      const existingEmployeeNo = await Employee.findOne({ where: { employee_no } })
      if (existingEmployeeNo) {
        return res.status(400).json({
          success: false,
          message: '员工编号已存在'
        })
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password || '123456', 10)

    // 自动生成员工编号（如果未提供）
    const autoEmployeeNo = employee_no || `EMP${Date.now().toString().slice(-6)}`

    const employee = await Employee.create({
      employee_no: autoEmployeeNo,
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'employee',
      hire_date: hire_date || new Date(),
      max_shifts_per_week: max_shifts_per_week || 5,
      max_shifts_per_day: max_shifts_per_day || 1,
      status: 'active'
    })

    // 返回不包含密码的员工信息
    const employeeResult = await Employee.findByPk(employee.id, {
      attributes: { exclude: ['password'] }
    })

    res.status(201).json({
      success: true,
      message: '员工创建成功',
      data: employeeResult
    })
  } catch (error) {
    console.error('创建员工失败:', error)
    res.status(500).json({
      success: false,
      message: '创建员工失败',
      error: error.message
    })
  }
})

// 更新员工 (仅管理员)
router.put('/:id', restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      employee_no,
      name,
      email,
      phone,
      role,
      hire_date,
      status,
      max_shifts_per_week,
      max_shifts_per_day
    } = req.body

    const employee = await Employee.findByPk(id)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    // 检查邮箱是否被其他员工使用
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({ 
        where: { 
          email,
          id: { [Op.ne]: id }
        }
      })
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他员工使用'
        })
      }
    }

    // 检查员工编号是否被其他员工使用
    if (employee_no && employee_no !== employee.employee_no) {
      const existingEmployeeNo = await Employee.findOne({ 
        where: { 
          employee_no,
          id: { [Op.ne]: id }
        }
      })
      if (existingEmployeeNo) {
        return res.status(400).json({
          success: false,
          message: '员工编号已被其他员工使用'
        })
      }
    }

    await employee.update({
      employee_no: employee_no || employee.employee_no,
      name: name || employee.name,
      email: email || employee.email,
      phone: phone || employee.phone,
      role: role || employee.role,
      hire_date: hire_date || employee.hire_date,
      status: status || employee.status,
      max_shifts_per_week: max_shifts_per_week || employee.max_shifts_per_week,
      max_shifts_per_day: max_shifts_per_day || employee.max_shifts_per_day
    })

    // 返回更新后的员工信息
    const updatedEmployee = await Employee.findByPk(id, {
      attributes: { exclude: ['password'] }
    })

    res.json({
      success: true,
      message: '员工更新成功',
      data: updatedEmployee
    })
  } catch (error) {
    console.error('更新员工失败:', error)
    res.status(500).json({
      success: false,
      message: '更新员工失败',
      error: error.message
    })
  }
})

// 软删除员工（停用） (仅管理员)
router.put('/:id/disable', restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params

    const employee = await Employee.findByPk(id)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    await employee.update({ status: 'inactive' })

    res.json({
      success: true,
      message: '员工已停用'
    })
  } catch (error) {
    console.error('停用员工失败:', error)
    res.status(500).json({
      success: false,
      message: '停用员工失败',
      error: error.message
    })
  }
})

// 物理删除员工 (仅管理员)
router.delete('/:id', restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params

    const employee = await Employee.findByPk(id)
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      })
    }

    // 检查员工是否已被停用
    if (employee.status === 'active') {
      return res.status(400).json({
        success: false,
        message: '只能删除已停用的员工'
      })
    }

    // 物理删除员工（包括相关数据）
    await employee.destroy()

    res.json({
      success: true,
      message: '员工删除成功'
    })
  } catch (error) {
    console.error('删除员工失败:', error)
    res.status(500).json({
      success: false,
      message: '删除员工失败',
      error: error.message
    })
  }
})

// 搜索员工
router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params
    const employees = await Employee.search(keyword)

    res.json({
      success: true,
      data: employees
    })
  } catch (error) {
    console.error('搜索员工失败:', error)
    res.status(500).json({
      success: false,
      message: '搜索员工失败',
      error: error.message
    })
  }
})

// 批量导入员工 (仅管理员)
router.post('/batch', restrictTo('admin'), async (req, res) => {
  try {
    const { employees } = req.body

    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的员工列表'
      })
    }

    const results = []
    const errors = []

    for (const empData of employees) {
      try {
        // 检查必填字段
        if (!empData.name || !empData.email) {
          errors.push({
            data: empData,
            error: '姓名和邮箱为必填字段'
          })
          continue
        }

        // 检查邮箱是否已存在
        const existingEmployee = await Employee.findOne({ 
          where: { email: empData.email } 
        })
        if (existingEmployee) {
          errors.push({
            data: empData,
            error: '邮箱已存在'
          })
          continue
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(empData.password || '123456', 10)

        const employee = await Employee.create({
          ...empData,
          password: hashedPassword,
          role: empData.role || 'employee',
          status: 'active',
          max_shifts_per_week: empData.max_shifts_per_week || 5,
          max_shifts_per_day: empData.max_shifts_per_day || 1,
          hire_date: empData.hire_date || new Date()
        })

        results.push(employee)
      } catch (error) {
        errors.push({
          data: empData,
          error: error.message
        })
      }
    }

    res.json({
      success: true,
      message: '批量导入完成',
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors
      }
    })
  } catch (error) {
    console.error('批量导入员工失败:', error)
    res.status(500).json({
      success: false,
      message: '批量导入员工失败',
      error: error.message
    })
  }
})


module.exports = router