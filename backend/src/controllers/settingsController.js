const { SystemSettings, EmailTemplate } = require('../models')
const { validationResult } = require('express-validator')
const moment = require('moment')

class SettingsController {
  // 获取所有设置
  async getAllSettings(req, res) {
    try {
      const settings = await SystemSettings.findAll({
        where: { is_active: true }
      })

      // 按分类组织设置数据
      const organizedSettings = {
        general: {},
        schedule: {},
        notification: {},
        ai: {}
      }

      settings.forEach(setting => {
        organizedSettings[setting.category][setting.key] = setting.value
      })

      res.json({
        success: true,
        data: organizedSettings
      })
    } catch (error) {
      console.error('获取设置失败:', error)
      res.status(500).json({
        success: false,
        message: '获取设置失败',
        error: error.message
      })
    }
  }

  // 获取指定分类的设置
  async getSettingsByCategory(req, res) {
    try {
      const { category } = req.params
      
      const settings = await SystemSettings.findAll({
        where: { 
          category,
          is_active: true 
        }
      })

      const categorySettings = {}
      settings.forEach(setting => {
        categorySettings[setting.key] = setting.value
      })

      res.json({
        success: true,
        data: categorySettings
      })
    } catch (error) {
      console.error('获取分类设置失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分类设置失败',
        error: error.message
      })
    }
  }

  // 更新设置
  async updateSettings(req, res) {
    try {
      const { category } = req.params
      const settingsData = req.body

      // 验证分类是否有效
      const validCategories = ['general', 'notification', 'ai']
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: '无效的设置分类'
        })
      }

      // 验证设置数据
      const errors = []
      
      // 根据类别验证数据
      switch (category) {
        case 'general':
          if (settingsData.system_config && settingsData.system_config.weekStartDate) {
            const weekStartDate = moment(settingsData.system_config.weekStartDate)
            if (!weekStartDate.isValid()) {
              errors.push('周起始日期格式无效')
            }
          }
          if (settingsData.system_info) {
            const { systemName, timezone, language } = settingsData.system_info
            if (!systemName || systemName.length < 2) {
              errors.push('系统名称不能少于2个字符')
            }
            if (timezone && !['Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'Europe/London'].includes(timezone)) {
              errors.push('不支持的时区设置')
            }
            if (language && !['zh-CN', 'zh-TW', 'en-US'].includes(language)) {
              errors.push('不支持的语言设置')
            }
          }
          break
          
        case 'notification':
          if (settingsData.email_config && settingsData.email_config.enabled) {
            const { smtpHost, smtpPort, smtpUser, smtpPassword } = settingsData.email_config
            if (!smtpHost) errors.push('SMTP服务器地址不能为空')
            if (!smtpPort || smtpPort < 1 || smtpPort > 65535) {
              errors.push('SMTP端口应在1-65535之间')
            }
            if (!smtpUser) errors.push('SMTP用户名不能为空')
            if (!smtpPassword) errors.push('SMTP密码不能为空')
            
            // 验证邮箱格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (smtpUser && !emailRegex.test(smtpUser)) {
              errors.push('SMTP用户名必须是有效的邮箱地址')
            }
          }
          break
          
        case 'ai':
          if (settingsData.ai_config && settingsData.ai_config.enabled) {
            const { provider, config } = settingsData.ai_config
            if (!provider || !['deepseek'].includes(provider)) {
              errors.push('AI提供商必须是deepseek')
            }
            if (!config || !config[provider] || !config[provider].apiKey) {
              errors.push(`${provider} API Key不能为空`)
            }
            // 验证 API URL 格式（可选，有默认值）
            if (config[provider].apiUrl) {
              const urlRegex = /^https?:\/\/.+/
              if (!urlRegex.test(config[provider].apiUrl)) {
                errors.push(`${provider} API URL 格式不正确，必须以 http:// 或 https:// 开头`)
              }
            }
          }
          break
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '设置验证失败',
          errors: errors
        })
      }

      // 更新每个设置项
      const updatePromises = Object.entries(settingsData).map(async ([key, value]) => {
        const [setting, created] = await SystemSettings.findOrCreate({
          where: { category, key },
          defaults: {
            category,
            key,
            value,
            description: `${category} - ${key} 设置`
          }
        })

        if (!created) {
          setting.value = value
          await setting.save()
        }

        return setting
      })

      await Promise.all(updatePromises)

      res.json({
        success: true,
        message: `${category}设置更新成功`
      })
    } catch (error) {
      console.error('更新设置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新设置失败',
        error: error.message
      })
    }
  }


  // 获取邮件模板列表
  async getEmailTemplates(req, res) {
    try {
      const templates = await EmailTemplate.findAll({
        where: { is_active: true },
        order: [['event_type', 'ASC'], ['is_default', 'DESC']]
      })

      res.json({
        success: true,
        data: templates
      })
    } catch (error) {
      console.error('获取邮件模板失败:', error)
      res.status(500).json({
        success: false,
        message: '获取邮件模板失败',
        error: error.message
      })
    }
  }

  // 创建邮件模板
  async createEmailTemplate(req, res) {
    try {
      console.log('创建邮件模板请求数据:', JSON.stringify(req.body, null, 2))
      
      // 验证必需字段
      const { name, subject, content, event_type } = req.body
      if (!name || !subject || !content || !event_type) {
        return res.status(400).json({
          success: false,
          message: '缺少必需字段'
        })
      }

      const template = await EmailTemplate.create(req.body)
      console.log('邮件模板创建成功:', template.id)
      
      res.json({
        success: true,
        message: '邮件模板创建成功',
        data: template
      })
    } catch (error) {
      console.error('创建邮件模板详细错误:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      })
      res.status(500).json({
        success: false,
        message: '创建邮件模板失败',
        error: error.message
      })
    }
  }

  // 更新邮件模板
  async updateEmailTemplate(req, res) {
    try {
      const { id } = req.params
      const template = await EmailTemplate.findByPk(id)

      if (!template) {
        return res.status(404).json({
          success: false,
          message: '邮件模板不存在'
        })
      }

      await template.update(req.body)

      res.json({
        success: true,
        message: '邮件模板更新成功',
        data: template
      })
    } catch (error) {
      console.error('更新邮件模板失败:', error)
      res.status(500).json({
        success: false,
        message: '更新邮件模板失败',
        error: error.message
      })
    }
  }

  // 删除邮件模板
  async deleteEmailTemplate(req, res) {
    try {
      const { id } = req.params
      const template = await EmailTemplate.findByPk(id)

      if (!template) {
        return res.status(404).json({
          success: false,
          message: '邮件模板不存在'
        })
      }

      // 软删除：标记为不活跃
      await template.update({ is_active: false })

      res.json({
        success: true,
        message: '邮件模板删除成功'
      })
    } catch (error) {
      console.error('删除邮件模板失败:', error)
      res.status(500).json({
        success: false,
        message: '删除邮件模板失败',
        error: error.message
      })
    }
  }

  // 计算周数信息
  async getWeekInfo(req, res) {
    try {
      // 获取周起始设置
      const weekStartSetting = await SystemSettings.findOne({
        where: { category: 'general', key: 'week_start' }
      })

      if (!weekStartSetting) {
        return res.status(404).json({
          success: false,
          message: '未找到周起始日期设置'
        })
      }

      const { weekStartDate } = weekStartSetting.value
      const startDate = moment(weekStartDate)
      const currentDate = moment()

      // 计算当前是第几周
      const daysDiff = currentDate.diff(startDate, 'days')
      const weekNumber = Math.floor(daysDiff / 7) + 1

      // 计算当前周的开始和结束日期
      const currentWeekStart = startDate.clone().add((weekNumber - 1) * 7, 'days')
      const currentWeekEnd = currentWeekStart.clone().add(6, 'days')

      res.json({
        success: true,
        data: {
          weekStartDate: weekStartDate,
          currentWeek: weekNumber,
          currentWeekStart: currentWeekStart.format('YYYY-MM-DD'),
          currentWeekEnd: currentWeekEnd.format('YYYY-MM-DD'),
          daysDiff: daysDiff
        }
      })
    } catch (error) {
      console.error('获取周信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取周信息失败',
        error: error.message
      })
    }
  }

  // 导出设置
  async exportSettings(req, res) {
    try {
      const settings = await SystemSettings.findAll({
        where: { is_active: true }
      })

      const templates = await EmailTemplate.findAll({
        where: { is_active: true }
      })

      const exportData = {
        settings: settings.map(s => ({
          category: s.category,
          key: s.key,
          value: s.value,
          description: s.description
        })),
        templates: templates.map(t => ({
          name: t.name,
          subject: t.subject,
          content: t.content,
          variables: t.variables,
          event_type: t.event_type
        })),
        exportTime: new Date().toISOString(),
        version: '1.0'
      }

      res.setHeader('Content-Disposition', 'attachment; filename=system_settings.json')
      res.setHeader('Content-Type', 'application/json')
      res.json(exportData)
    } catch (error) {
      console.error('导出设置失败:', error)
      res.status(500).json({
        success: false,
        message: '导出设置失败',
        error: error.message
      })
    }
  }

  // 导入设置
  async importSettings(req, res) {
    try {
      const { settings, templates } = req.body

      if (!settings && !templates) {
        return res.status(400).json({
          success: false,
          message: '导入数据不能为空'
        })
      }

      // 导入设置
      if (settings && Array.isArray(settings)) {
        for (const setting of settings) {
          await SystemSettings.findOrCreate({
            where: { category: setting.category, key: setting.key },
            defaults: {
              category: setting.category,
              key: setting.key,
              value: setting.value,
              description: setting.description
            }
          })
        }
      }

      // 导入模板
      if (templates && Array.isArray(templates)) {
        for (const template of templates) {
          await EmailTemplate.findOrCreate({
            where: { name: template.name },
            defaults: template
          })
        }
      }

      res.json({
        success: true,
        message: '设置导入成功'
      })
    } catch (error) {
      console.error('导入设置失败:', error)
      res.status(500).json({
        success: false,
        message: '导入设置失败',
        error: error.message
      })
    }
  }

  // 获取AI设置的辅助方法
  async getAISettings() {
    const setting = await SystemSettings.findOne({
      where: { category: 'ai', key: 'ai_config', is_active: true }
    })
    return setting ? setting.value : null
  }

  // 获取邮件设置的辅助方法  
  async getEmailSettings() {
    const setting = await SystemSettings.findOne({
      where: { category: 'notification', key: 'email_config', is_active: true }
    })
    return setting ? setting.value : null
  }
}

module.exports = new SettingsController()