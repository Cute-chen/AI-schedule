import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    
    // 添加授权token
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 显示加载状态
    if (config.showLoading !== false) {
      // 可以在这里添加全局loading
    }

    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    const res = response.data

    // 隐藏加载状态
    // hideLoading()

    // 根据业务状态码处理响应
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  error => {
    console.error('Response error:', error)
    
    // 隐藏加载状态
    // hideLoading()

    const { response } = error
    const userStore = useUserStore()

    if (response) {
      switch (response.status) {
        case 401:
          // 信息错误
          ElMessage.error('账号或密码错误，请重新登录')
          userStore.logout()
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限访问该资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 409:
          // 冲突错误（如重复记录），不显示错误消息，让调用方处理
          break
        case 422:
          // 表单验证错误
          const message = response.data?.message || '表单验证失败'
          ElMessage.error(message)
          break
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        case 502:
        case 503:
        case 504:
          ElMessage.error('服务暂时不可用')
          break
        default:
          ElMessage.error(`请求失败: ${response.status}`)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }

    return Promise.reject(error)
  }
)

// API方法封装
const request = {
  // GET请求
  get(url, params = {}, config = {}) {
    return api.get(url, { params, ...config })
  },

  // POST请求
  post(url, data = {}, config = {}) {
    return api.post(url, data, config)
  },

  // PUT请求
  put(url, data = {}, config = {}) {
    return api.put(url, data, config)
  },

  // PATCH请求
  patch(url, data = {}, config = {}) {
    return api.patch(url, data, config)
  },

  // DELETE请求
  delete(url, data = {}, config = {}) {
    // 如果第二个参数是配置对象而不是数据，保持向后兼容
    if (data && typeof data === 'object' && !Array.isArray(data) && 
        (data.headers || data.params || data.timeout || data.responseType)) {
      return api.delete(url, data)
    }
    // 否则将数据放在请求体中
    return api.delete(url, { data, ...config })
  },

  // 文件上传
  upload(url, formData, config = {}) {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    })
  },

  // 文件下载
  download(url, params = {}, config = {}) {
    return api.get(url, {
      params,
      responseType: 'blob',
      ...config
    })
  }
}

// 业务API模块

// 认证相关API
export const authAPI = {
  // 登录
  login(data) {
    return request.post('/auth/login', data)
  },

  // 注册（管理员创建员工）
  register(data) {
    return request.post('/auth/register', data)
  },

  // 员工自助注册
  selfRegister(data) {
    return request.post('/auth/self-register', data)
  },

  // 验证推荐人
  validateReferrer(data) {
    return request.post('/auth/validate-referrer', data)
  },

  // 获取待审核的注册申请（管理员）
  getPendingRegistrations() {
    return request.get('/auth/pending-registrations')
  },

  // 审核注册申请（管理员）
  approveRegistration(id, data) {
    return request.post(`/auth/approve-registration/${id}`, data)
  },

  // 获取用户信息
  getUserInfo() {
    return request.get('/auth/me')
  },

  // 刷新token
  refreshToken() {
    return request.post('/auth/refresh')
  },

  // 退出登录
  logout() {
    return request.post('/auth/logout')
  }
}

// 员工管理API
export const employeeApi = {
  // 获取员工列表
  getEmployees(params = {}) {
    return request.get('/employees', params)
  },

  // 获取员工详情
  getEmployee(id) {
    return request.get(`/employees/${id}`)
  },

  // 创建员工
  createEmployee(data) {
    return request.post('/employees', data)
  },

  // 更新员工
  updateEmployee(id, data) {
    return request.put(`/employees/${id}`, data)
  },

  // 删除员工
  deleteEmployee(id) {
    return request.delete(`/employees/${id}`)
  },

  // 验证推荐人
  validateReferrer(data) {
    return request.post('/employees/validate-referrer', data)
  },

  // 获取推荐关系统计（管理员）
  getReferralStats() {
    return request.get('/employees/referral-stats')
  },

  // 获取我的推荐信息（员工）
  getMyReferrals() {
    return request.get('/employees/my-referrals')
  }
}


// 可用性管理API
export const availabilityApi = {
  // 获取可用性列表
  getAvailabilities(params = {}) {
    return request.get('/availability', params)
  },

  // 创建可用性
  createAvailability(data) {
    return request.post('/availability', data)
  },

  // 批量创建可用性
  batchCreateAvailability(data) {
    return request.post('/availability/batch', data)
  },

  // 更新可用性
  updateAvailability(id, data) {
    return request.put(`/availability/${id}`, data)
  },

  // 删除可用性
  deleteAvailability(id) {
    return request.delete(`/availability/${id}`)
  },

  // 获取员工可用性
  getEmployeeAvailability(employeeId, params = {}) {
    return request.get(`/availability/employee/${employeeId}`, params)
  },

  // 获取时间段配置
  getTimeSlots() {
    return request.get('/availability/timeslots')
  },

  // 创建时间段
  createTimeSlot(data) {
    return request.post('/availability/timeslots', data)
  },

  // 更新时间段
  updateTimeSlot(id, data) {
    return request.put(`/availability/timeslots/${id}`, data)
  },

  // 删除时间段
  deleteTimeSlot(id) {
    return request.delete(`/availability/timeslots/${id}`)
  },

  // 高级批量创建空闲时间
  batchCreateAvailabilityAdvanced(data) {
    return request.post('/availability/batch-advanced', data)
  },

  // 获取批量操作状态
  getBatchOperationStatus(id) {
    return request.get(`/availability/batch/${id}`)
  },


  // 按周批量删除员工空闲时间
  batchDeleteEmployeeAvailabilityByWeeks(employeeId, data) {
    return request.delete(`/availability/employees/${employeeId}/weeks`, data)
  },

  // 按周批量删除所有员工的空闲时间
  batchDeleteAllAvailabilityByWeeks(data) {
    return request.delete('/availability/batch/weeks', data)
  }
}

// 排班管理API
export const scheduleApi = {
  // 获取排班列表
  getSchedules(params = {}) {
    return request.get('/schedules', params)
  },

  // 创建排班
  createSchedule(data) {
    return request.post('/schedules', data)
  },

  // 批量排班
  batchSchedule(data) {
    return request.post('/schedules/batch', data)
  },

  // 更新排班
  updateSchedule(id, data) {
    return request.put(`/schedules/${id}`, data)
  },

  // 删除排班
  deleteSchedule(id) {
    return request.delete(`/schedules/${id}`)
  },

  // 获取排班日历
  getScheduleCalendar(params = {}) {
    return request.get('/schedules/calendar', params)
  },

  // 获取排班规则
  getRules() {
    return request.get('/schedule/rules')
  },

  // 更新排班规则
  updateRules(data) {
    return request.put('/schedule/rules', data)
  },

  // 自动排班
  autoSchedule(data) {
    return request.post('/ai-schedule/auto', data, { timeout: 300000 })
  },

  // 验证AI排班结果
  validateAISchedule(data) {
    return request.post('/ai-schedule/validate', data)
  },

  // 应用AI排班建议
  applyAISchedule(data) {
    return request.post('/ai-schedule/apply', data)
  },

  // 导出排班表
  exportSchedule(weekStart) {
    // 统一使用相对路径，让axios实例处理baseURL
    // 这样在不同环境下都能正确工作
    return `/ai-schedule/export/${weekStart}`
  },

  // 发送通知
  sendNotifications(data) {
    return request.post('/schedules/send-notifications', data)
  },

  // 高级批量排班
  batchScheduleAdvanced(data) {
    return request.post('/schedules/batch-advanced', data)
  },

  // 批量调班
  batchAdjustSchedule(data) {
    return request.post('/schedules/batch-adjust', data)
  },

  // 复制排班到指定周
  copyScheduleToWeeks(data) {
    return request.post('/schedules/copy', data)
  },


  // 同步排班到其他周
  syncSchedulesToWeeks(data) {
    return request.post('/schedules/sync-to-weeks', data)
  },

  // 批量删除排班 - 按周范围删除
  batchDeleteSchedulesByWeeks(data) {
    return request.post('/schedules/batch-delete-weeks', data)
  }
}

// 班次请求API
export const shiftRequestApi = {
  // 获取班次请求列表 (管理员)
  getShiftRequests(params = {}) {
    return request.get('/shift-requests', params)
  },

  // 获取我的班次请求列表 (员工)
  getMyShiftRequests(params = {}) {
    return request.get('/shift-requests/my', params)
  },

  // 创建班次请求
  createRequest(data) {
    return request.post('/shift-requests', data)
  },

  // 更新班次请求
  updateRequest(id, data) {
    return request.put(`/shift-requests/${id}`, data)
  },

  // 撤销班次请求 (员工)
  cancelRequest(id) {
    return request.post(`/shift-requests/${id}/cancel`)
  },

  // 审批班次请求 (管理员)
  approveRequest(id, data) {
    return request.post(`/shift-requests/${id}/approve`, data)
  },

  // 拒绝班次请求 (管理员)
  rejectRequest(id, data) {
    return request.post(`/shift-requests/${id}/reject`, data)
  },

  // 删除班次请求 (管理员)
  deleteRequest(id) {
    return request.delete(`/shift-requests/${id}`)
  },

  // 获取请求统计
  getStats() {
    return request.get('/shift-requests/stats')
  },

  // 获取我的请求统计 (员工)
  getMyStats() {
    return request.get('/shift-requests/my/stats')
  },

  // 获取我的可调班排班
  getMySchedules(params = {}) {
    return request.get('/shift-requests/my-schedules', params)
  },

  // 获取可交换的选项
  getAvailableSwaps(scheduleId) {
    return request.get(`/shift-requests/available-swaps/${scheduleId}`)
  },

  // 验证调班可行性
  validateSwap(data) {
    return request.post('/shift-requests/validate', data)
  }
}


// 系统设置API
export const settingsApi = {
  // 获取系统设置
  getSettings() {
    return request.get('/settings')
  },

  // 获取指定分类设置
  getSettingsByCategory(category) {
    return request.get(`/settings/categories/${category}`)
  },

  // 更新系统设置
  updateSettings(category, data) {
    return request.put(`/settings/${category}`, data)
  },


  // 测试邮件配置
  testEmail(config) {
    return request.post('/settings/email/test', config)
  },

  // 邮件模板管理
  getEmailTemplates() {
    return request.get('/settings/email/templates')
  },

  createEmailTemplate(data) {
    return request.post('/settings/email/templates', data)
  },

  updateEmailTemplate(id, data) {
    return request.put(`/settings/email/templates/${id}`, data)
  },

  deleteEmailTemplate(id) {
    return request.delete(`/settings/email/templates/${id}`)
  },

  // AI配置管理
  testAIConnection(provider, config) {
    return request.post('/settings/ai/test', { provider, config })
  },

  // 系统健康检查
  getSystemHealth() {
    return request.get('/settings/health')
  },

  // 周信息计算
  getWeekInfo() {
    return request.get('/settings/week/info')
  },

  // 设置导入导出
  exportSettings() {
    return request.get('/settings/export')
  },

  importSettings(data) {
    return request.post('/settings/import', data)
  }
}

// 批量操作API
export const batchApi = {
  // 获取批量操作列表
  getBatchOperations(params = {}) {
    return request.get('/batch-operations', params)
  },

  // 获取批量操作详情
  getBatchOperation(id) {
    return request.get(`/batch-operations/${id}`)
  },

  // 取消批量操作
  cancelBatchOperation(id) {
    return request.post(`/batch-operations/${id}/cancel`)
  }
}

// 工时统计相关API
export const workHoursApi = {
  // 获取员工工时统计
  getEmployeeWorkHours: (params) => api.get('/statistics/employee-workhours', { params }),
  
  // 获取所有员工工时统计（管理员用）  
  getAllEmployeesWorkHours: (params) => api.get('/statistics/all-employees-workhours', { params }),
}

export default request