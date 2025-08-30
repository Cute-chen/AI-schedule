import { settingsApi } from '@/services/api'

/**
 * 设置服务 - 提供统一的设置获取和缓存接口
 */
class SettingsService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = new Map()
    this.CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  }

  /**
   * 获取缓存的设置数据
   */
  _getCachedData(key) {
    const now = Date.now()
    const expiry = this.cacheExpiry.get(key)
    
    if (expiry && now < expiry) {
      return this.cache.get(key)
    }
    
    // 缓存已过期，清除
    this.cache.delete(key)
    this.cacheExpiry.delete(key)
    return null
  }

  /**
   * 设置缓存数据
   */
  _setCachedData(key, data) {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * 获取所有设置
   */
  async getAllSettings() {
    const cached = this._getCachedData('all_settings')
    if (cached) {
      return cached
    }

    try {
      const response = await settingsApi.getSettings()
      const settings = response.data
      this._setCachedData('all_settings', settings)
      return settings
    } catch (error) {
      console.error('Failed to get settings:', error)
      return {}
    }
  }

  /**
   * 获取周起始日期设置
   * @returns {Promise<Date>} 周起始日期
   */
  async getWeekStartDate() {
    const cached = this._getCachedData('week_start_date')
    if (cached) {
      return new Date(cached)
    }

    try {
      const settings = await this.getAllSettings()
      const weekStartDate = settings.general?.system_config?.weekStartDate
      
      if (weekStartDate) {
        this._setCachedData('week_start_date', weekStartDate)
        return new Date(weekStartDate)
      }
      
      // 默认为当前周的周一
      const today = new Date()
      const dayOfWeek = today.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周日为0，需要减6天
      const monday = new Date(today)
      monday.setDate(today.getDate() - daysToSubtract)
      
      return monday
    } catch (error) {
      console.error('Failed to get week start date:', error)
      // 返回默认值：本周周一
      const today = new Date()
      const dayOfWeek = today.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(today)
      monday.setDate(today.getDate() - daysToSubtract)
      return monday
    }
  }

  /**
   * 获取工作日设置
   * @returns {Promise<Array<string>>} 工作日数组 ['1', '2', '3', '4', '5']
   */
  async getWorkDays() {
    const cached = this._getCachedData('work_days')
    if (cached) {
      return cached
    }

    try {
      const settings = await this.getAllSettings()
      const workDays = settings.general?.system_config?.workDays
      
      if (workDays && Array.isArray(workDays)) {
        this._setCachedData('work_days', workDays)
        return workDays
      }
      
      // 默认工作日：周一到周五
      const defaultWorkDays = ['1', '2', '3', '4', '5']
      this._setCachedData('work_days', defaultWorkDays)
      return defaultWorkDays
    } catch (error) {
      console.error('Failed to get work days:', error)
      return ['1', '2', '3', '4', '5'] // 默认周一到周五
    }
  }

  /**
   * 计算基于设置的周起始日期
   * @param {Date} date 基准日期
   * @returns {Promise<Date>} 该周的起始日期
   */
  async calculateWeekStart(date) {
    try {
      const weekStartDate = await this.getWeekStartDate()
      const targetDate = new Date(date)
      
      // 计算从设定的周起始日期到目标日期的天数差
      const daysDiff = Math.floor((targetDate - weekStartDate) / (1000 * 60 * 60 * 24))
      
      // 计算目标日期所在周的起始日期
      const weeksDiff = Math.floor(daysDiff / 7)
      const weekStart = new Date(weekStartDate)
      weekStart.setDate(weekStartDate.getDate() + weeksDiff * 7)
      
      return weekStart
    } catch (error) {
      console.error('Failed to calculate week start:', error)
      // 回退到传统周计算（周一开始）
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }
  }

  /**
   * 检查指定日期是否为工作日
   * @param {Date} date 要检查的日期
   * @returns {Promise<boolean>} 是否为工作日
   */
  async isWorkDay(date) {
    try {
      const workDays = await this.getWorkDays()
      const dayOfWeek = date.getDay()
      const dayStr = dayOfWeek === 0 ? '7' : dayOfWeek.toString() // 周日为7
      return workDays.includes(dayStr)
    } catch (error) {
      console.error('Failed to check work day:', error)
      // 默认周一到周五为工作日
      const dayOfWeek = date.getDay()
      return dayOfWeek >= 1 && dayOfWeek <= 5
    }
  }

  /**
   * 获取一周的工作日列表
   * @param {Date} weekStart 周起始日期
   * @returns {Promise<Array<Date>>} 工作日日期列表
   */
  async getWorkDaysInWeek(weekStart) {
    try {
      const workDays = await this.getWorkDays()
      const workDayDates = []
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        
        const dayOfWeek = date.getDay()
        const dayStr = dayOfWeek === 0 ? '7' : dayOfWeek.toString()
        
        if (workDays.includes(dayStr)) {
          workDayDates.push(date)
        }
      }
      
      return workDayDates
    } catch (error) {
      console.error('Failed to get work days in week:', error)
      return []
    }
  }

  /**
   * 刷新设置缓存
   * 在设置更新后调用
   */
  async refreshSettings() {
    this.clearCache()
    await this.getAllSettings() // 重新加载设置
  }
}

// 导出单例实例
export const settingsService = new SettingsService()
export default settingsService