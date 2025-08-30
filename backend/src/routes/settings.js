const express = require('express')
const { Employee } = require('../models')
const settingsController = require('../controllers/settingsController')
const emailService = require('../services/emailService')
const aiService = require('../services/aiService')
const router = express.Router()

// 获取所有设置
router.get('/', settingsController.getAllSettings)

// 获取指定分类设置
router.get('/categories/:category', settingsController.getSettingsByCategory)

// 更新设置
router.put('/:category', settingsController.updateSettings)


// 测试邮件配置
router.post('/email/test', async (req, res) => {
  try {
    const result = await emailService.testConnection(req.body)
    
    res.json({
      success: result.success,
      message: result.message
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '邮件测试失败',
      error: error.message
    })
  }
})

// 邮件模板管理
router.get('/email/templates', settingsController.getEmailTemplates)
router.post('/email/templates', settingsController.createEmailTemplate)
router.put('/email/templates/:id', settingsController.updateEmailTemplate)
router.delete('/email/templates/:id', settingsController.deleteEmailTemplate)

// AI配置测试
router.post('/ai/test', async (req, res) => {
  try {
    const { provider, config } = req.body
    const result = await aiService.testConnection(provider, config)
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'AI连接测试失败',
      error: error.message
    })
  }
})

// 系统健康检查
router.get('/health', async (req, res) => {
  try {
    const health = {
      database: { connected: true, text: '连接正常', lastCheck: new Date() },
      ai: { connected: false, text: '未配置', lastCheck: new Date() },
      email: { connected: false, text: '未配置', lastCheck: new Date() }
    }

    // 检查AI服务配置状态（只检查是否有AI相关设置）
    try {
      const { SystemSettings } = require('../models')
      const aiSetting = await SystemSettings.findOne({
        where: { 
          category: 'ai', 
          is_active: true 
        }
      })
      if (aiSetting) {
        health.ai.connected = true
        health.ai.text = '已配置'
      }
    } catch (error) {
      health.ai.text = '检查失败'
    }

    // 检查邮件服务配置状态（只检查是否有邮件相关设置）
    try {
      const { SystemSettings } = require('../models')
      const emailSetting = await SystemSettings.findOne({
        where: { 
          category: 'notification', 
          is_active: true 
        }
      })
      if (emailSetting) {
        health.email.connected = true
        health.email.text = '已配置'
      }
    } catch (error) {
      health.email.text = '检查失败'
    }

    res.json({
      success: true,
      data: health
    })
  } catch (error) {
    console.error('系统健康检查失败:', error)
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    })
  }
})

// 周信息计算
router.get('/week/info', settingsController.getWeekInfo)

// 设置导入导出
router.get('/export', settingsController.exportSettings)
router.post('/import', settingsController.importSettings)


module.exports = router