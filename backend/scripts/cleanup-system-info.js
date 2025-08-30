#!/usr/bin/env node

/**
 * 清理系统信息设置脚本
 * 删除无用的系统信息配置，只保留有用的周起始日期和工作日设置
 */

const { SystemSettings } = require('../src/models')
const { Op } = require('sequelize')

async function cleanupSystemInfo() {
  try {
    console.log('开始清理系统信息设置...')

    // 1. 查询现有的 general 类别设置
    const existingSettings = await SystemSettings.findAll({
      where: { category: 'general' }
    })

    console.log('当前 general 类别设置：')
    existingSettings.forEach(setting => {
      console.log(`- ${setting.key}: ${JSON.stringify(setting.value)}`)
    })

    // 2. 删除 system_info 设置
    const deletedInfoCount = await SystemSettings.destroy({
      where: {
        category: 'general',
        key: 'system_info'
      }
    })

    console.log(`已删除 ${deletedInfoCount} 个系统信息设置`)

    // 3. 删除重复的 week_start 设置（使用 system_config 替代）
    const deletedWeekStartCount = await SystemSettings.destroy({
      where: {
        category: 'general',
        key: 'week_start'
      }
    })

    console.log(`已删除 ${deletedWeekStartCount} 个重复的周起始设置`)

    // 3. 检查是否存在 system_config 设置，如果不存在则创建默认值
    const systemConfig = await SystemSettings.findOne({
      where: {
        category: 'general',
        key: 'system_config'
      }
    })

    if (!systemConfig) {
      console.log('未找到 system_config 设置，创建默认配置...')
      
      // 获取本周周一作为默认周起始日期
      const today = new Date()
      const dayOfWeek = today.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(today)
      monday.setDate(today.getDate() - daysToSubtract)
      const weekStartDate = monday.toISOString().split('T')[0]

      await SystemSettings.create({
        category: 'general',
        key: 'system_config',
        value: {
          weekStartDate: weekStartDate,
          workDays: ['1', '2', '3', '4', '5'] // 周一到周五
        }
      })

      console.log('已创建默认 system_config 设置')
    } else {
      console.log('system_config 设置已存在，跳过创建')
    }

    // 4. 显示清理后的设置
    const remainingSettings = await SystemSettings.findAll({
      where: { category: 'general' }
    })

    console.log('\n清理后的 general 类别设置：')
    if (remainingSettings.length === 0) {
      console.log('- 无设置')
    } else {
      remainingSettings.forEach(setting => {
        console.log(`- ${setting.key}: ${JSON.stringify(setting.value, null, 2)}`)
      })
    }

    console.log('系统信息设置清理完成!')

  } catch (error) {
    console.error('清理系统信息设置失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupSystemInfo()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { cleanupSystemInfo }