import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由组件懒加载
const Layout = () => import('@/layout/index.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const Login = () => import('@/views/auth/Login.vue')
const Register = () => import('@/views/auth/Register.vue')
const ForgotPassword = () => import('@/views/auth/ForgotPassword.vue')
const ResetPassword = () => import('@/views/auth/ResetPassword.vue')

// 业务页面组件
const Employees = () => import('@/views/employees/index.vue')
const Schedules = () => import('@/views/schedules/index.vue')
const Availability = () => import('@/views/availability/index.vue')
const ShiftRequests = () => import('@/views/shift-requests/index.vue')
const Settings = () => import('@/views/settings/index.vue')

// 员工页面组件
const EmployeeShiftRequest = () => import('@/views/employee/ShiftRequest.vue')
const EmployeeAvailability = () => import('@/views/employee/Availability.vue')
const EmployeeChangePassword = () => import('@/views/employee/ChangePassword.vue')

// 管理员页面组件
const AdminChangePassword = () => import('@/views/admin/ChangePassword.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { 
      title: '用户登录',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { 
      title: '员工注册',
      requiresAuth: false
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { 
      title: '忘记密码',
      requiresAuth: false
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { 
      title: '重置密码',
      requiresAuth: false
    }
  },
  // 管理员路由
  {
    path: '/admin',
    component: Layout,
    redirect: '/admin/dashboard',
    meta: { 
      requiresAuth: true,
      requiresRole: 'admin'
    },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: Dashboard,
        meta: { 
          title: '首页概览',
          icon: 'HomeFilled'
        }
      },
      {
        path: 'employees',
        name: 'Employees',
        component: Employees,
        meta: { 
          title: '员工管理',
          icon: 'User'
        }
      },
      {
        path: 'schedules',
        name: 'Schedules',
        component: Schedules,
        meta: { 
          title: '排班管理',
          icon: 'Calendar'
        }
      },
      {
        path: 'availability',
        name: 'Availability',
        component: Availability,
        meta: { 
          title: '可用性管理',
          icon: 'Clock'
        }
      },
      {
        path: 'shift-requests',
        name: 'ShiftRequests',
        component: ShiftRequests,
        meta: { 
          title: '班次请求管理',
          icon: 'Document'
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: { 
          title: '系统设置',
          icon: 'Setting'
        }
      },
      {
        path: 'work-hours',
        name: 'AdminWorkHours',
        component: () => import('@/views/admin/WorkHoursStatistics.vue'),
        meta: { 
          title: '工时统计',
          icon: 'Clock'
        }
      },
      {
        path: 'referral-management',
        name: 'AdminReferralManagement',
        component: () => import('@/views/admin/ReferralManagement.vue'),
        meta: { 
          title: '推荐人员管理',
          icon: 'Connection'
        }
      },
      {
        path: 'change-password',
        name: 'AdminChangePassword',
        component: AdminChangePassword,
        meta: { 
          title: '修改密码',
          icon: 'Lock'
        }
      }
    ]
  },
  // 普通员工路由
  {
    path: '/employee',
    component: Layout,
    redirect: '/employee/dashboard',
    meta: { 
      requiresAuth: true,
      requiresRole: 'employee'
    },
    children: [
      {
        path: 'dashboard',
        name: 'EmployeeDashboard',
        component: () => import('@/views/employee/Dashboard.vue'),
        meta: { 
          title: '工作台',
          icon: 'HomeFilled'
        }
      },
      {
        path: 'shift-requests',
        name: 'EmployeeShiftRequests',
        component: EmployeeShiftRequest,
        meta: { 
          title: '我的调班申请',
          icon: 'Document'
        }
      },
      {
        path: 'availability',
        name: 'EmployeeAvailability',
        component: EmployeeAvailability,
        meta: { 
          title: '空闲时间管理',
          icon: 'Calendar'
        }
      },
      {
        path: 'work-hours',
        name: 'EmployeeWorkHours',
        component: () => import('@/views/employee/WorkHoursStatistics.vue'),
        meta: { 
          title: '我的工时',
          icon: 'Clock'
        }
      },
      {
        path: 'referral-management',
        name: 'EmployeeReferralManagement',
        component: () => import('@/views/employee/ReferralManagement.vue'),
        meta: { 
          title: '我的推荐',
          icon: 'Share'
        }
      },
      {
        path: 'change-password',
        name: 'EmployeeChangePassword',
        component: EmployeeChangePassword,
        meta: { 
          title: '修改密码',
          icon: 'Lock'
        }
      }
    ]
  },
  // 默认重定向路由
  {
    path: '/',
    redirect: (to) => {
      // 这里会在路由守卫中根据用户角色进行重定向
      return '/login'
    },
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  console.log('Route guard:', { 
    to: to.path, 
    from: from.path, 
    isAuthenticated: userStore.isAuthenticated, 
    userInfo: userStore.userInfo,
    token: !!userStore.token
  })
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 排班管理系统`
  }

  // 如果访问登录页且已登录，重定向到对应首页
  if (to.path === '/login') {
    if (userStore.isAuthenticated && userStore.userInfo) {
      const userRole = userStore.userInfo.role
      if (userRole === 'admin') {
        next('/admin/dashboard')
        return
      } else if (userRole === 'employee') {
        next('/employee/dashboard')
        return
      }
    }
    // 未登录或用户信息不完整，继续到登录页
    next()
    return
  }

  // 处理根路径重定向
  if (to.path === '/') {
    if (userStore.isAuthenticated && userStore.userInfo) {
      const userRole = userStore.userInfo.role
      if (userRole === 'admin') {
        next('/admin/dashboard')
        return
      } else if (userRole === 'employee') {
        next('/employee/dashboard')
        return
      }
    }
    // 未登录或用户信息不完整，重定向到登录页
    next('/login')
    return
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 如果没有token，直接跳转到登录页
    if (!userStore.token) {
      next('/login')
      return
    }

    // 如果有token但用户信息为空，尝试获取用户信息
    if (!userStore.userInfo) {
      try {
        await userStore.getUserInfo()
      } catch (error) {
        console.error('Token validation failed:', error)
        userStore.logout()
        next('/login')
        return
      }
    }
    
    // 再次检查是否已认证和用户信息是否存在
    if (!userStore.isAuthenticated || !userStore.userInfo) {
      next('/login')
      return
    }

    // 检查角色权限
    if (to.meta.requiresRole) {
      const userRole = userStore.userInfo.role
      const requiredRole = to.meta.requiresRole
      
      if (userRole !== requiredRole) {
        console.log('Role mismatch:', { userRole, requiredRole })
        // 权限不足，根据用户角色重定向到对应首页
        if (userRole === 'admin') {
          next('/admin/dashboard')
        } else if (userRole === 'employee') {
          next('/employee/dashboard')
        } else {
          next('/login')
        }
        return
      }
    }
  }

  next()
})

export default router