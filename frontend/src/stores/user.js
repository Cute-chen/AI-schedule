import { defineStore } from 'pinia'
import { authAPI } from '@/services/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    // 用户信息
    userInfo: null,
    // 认证token
    token: localStorage.getItem('token') || null,
    // 权限列表
    permissions: [],
    // 登录状态
    isLoggedIn: !!localStorage.getItem('token')
  }),

  getters: {
    // 获取用户名
    username: (state) => state.userInfo?.name || '',
    
    // 获取用户邮箱
    email: (state) => state.userInfo?.email || '',
    
    
    // 获取用户角色
    role: (state) => state.userInfo?.role || '',
    
    // 获取用户角色显示名称
    roleDisplayName: (state) => {
      const role = state.userInfo?.role
      return role === 'admin' ? '管理员' : '员工'
    },
    
    // 检查是否有特定权限
    hasPermission: (state) => (permission) => {
      return state.permissions.includes(permission)
    },

    // 检查是否是管理员
    isAdmin: (state) => {
      return state.userInfo?.role === 'admin'
    },

    // 获取用户头像
    avatar: (state) => {
      return state.userInfo?.avatar || ''
    },

    // 检查用户是否已登录（基于token存在性）
    isAuthenticated: (state) => {
      return !!state.token && state.isLoggedIn
    }
  },

  actions: {
    // 设置token
    setToken(token) {
      this.token = token
      this.isLoggedIn = !!token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo
    },

    // 设置权限
    setPermissions(permissions) {
      this.permissions = permissions || []
    },

    // 登录
    async login(loginForm) {
      try {
        const response = await authAPI.login(loginForm)
        const { token, user, permissions } = response.data
        
        this.setToken(token)
        this.setUserInfo(user)
        this.setPermissions(permissions)
        
        return response
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },

    // 获取用户信息
    async getUserInfo() {
      try {
        if (!this.token) {
          throw new Error('No token available')
        }

        const response = await authAPI.getUserInfo()
        const { user, permissions } = response.data
        
        this.setUserInfo(user)
        this.setPermissions(permissions)
        this.isLoggedIn = true
        
        return response
      } catch (error) {
        console.error('Get user info failed:', error)
        this.logout()
        throw error
      }
    },

    // 刷新token
    async refreshToken() {
      try {
        const response = await authAPI.refreshToken()
        const { token } = response.data
        
        this.setToken(token)
        
        return response
      } catch (error) {
        console.error('Refresh token failed:', error)
        this.logout()
        throw error
      }
    },

    // 退出登录
    async logout() {
      try {
        if (this.token) {
          await authAPI.logout()
        }
      } catch (error) {
        console.error('Logout API failed:', error)
      } finally {
        // 清除本地数据
        this.token = null
        this.userInfo = null
        this.permissions = []
        this.isLoggedIn = false
        localStorage.removeItem('token')
      }
    },

    // 更新用户信息
    updateUserInfo(updates) {
      if (this.userInfo) {
        this.userInfo = { ...this.userInfo, ...updates }
      }
    },

    // 检查token有效性
    async checkTokenValidity() {
      if (!this.token) {
        return false
      }

      try {
        await this.getUserInfo()
        return true
      } catch (error) {
        return false
      }
    },

    // 初始化用户状态
    async initUserState() {
      if (this.token) {
        try {
          await this.getUserInfo()
        } catch (error) {
          console.error('Initialize user state failed:', error)
          this.logout()
        }
      }
    }
  },

  // 数据持久化
  persist: {
    key: 'schedule-system-user',
    storage: localStorage,
    paths: ['userInfo', 'permissions', 'isLoggedIn']
  }
})