const axios = require('axios')
const { SystemSettings } = require('../models')
const settingsHelper = require('../utils/settingsHelper')

class AIService {
  constructor() {
    this.providers = {
      deepseek: {
        name: 'DeepSeek',
        defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
      },
    }
  }

  // 获取AI配置
  async getAIConfig() {
    try {
      const setting = await SystemSettings.findOne({
        where: { category: 'ai', key: 'ai_config' }
      })
      
      return setting ? setting.value : null
    } catch (error) {
      console.error('获取AI配置失败:', error)
      return null
    }
  }

  // 测试AI连接
  async testConnection(provider, config) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`不支持的AI提供商: ${provider}`)
      }

      const providerConfig = config || await this.getProviderConfig(provider)
      
      if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`${provider} API Key未配置`)
      }

      let response
      if (provider === 'deepseek') {
        response = await this.testDeepSeek(providerConfig)
      }

      return {
        success: true,
        message: `${this.providers[provider].name} 连接测试成功`,
        data: {
          provider: provider,
          model: providerConfig.model,
          response: response
        }
      }
    } catch (error) {
      console.error(`${provider} 连接测试失败:`, error)
      return {
        success: false,
        message: `${this.providers[provider]?.name || provider} 连接测试失败: ${error.message}`,
        error: error.message
      }
    }
  }

  // 测试DeepSeek连接
  async testDeepSeek(config) {
    const response = await axios.post(
      config.apiUrl || this.providers.deepseek.defaultUrl,
      {
        model: config.model || this.providers.deepseek.defaultModel,
        messages: [
          {
            role: 'user',
            content: '你好，请简单回应一下以测试连接。'
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout || 300000
      }
    )

    return response.data.choices[0].message.content
  }


  // 获取提供商配置
  async getProviderConfig(provider) {
    const aiConfig = await this.getAIConfig()
    return aiConfig?.config?.[provider] || null
  }

  // 生成排班建议
  async generateScheduleSuggestions(scheduleData, userId = null) {
    console.log('=== 开始生成AI排班建议 ===')
    
    console.log('开始AI排班生成...')
    
    // 设置超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('AI排班生成超时 (90秒)')
        reject(new Error('AI排班生成超时 (90秒)'))
      }, 90000)
    })
    
    const generatePromise = this.doGenerateScheduleSuggestions(scheduleData, userId)
    
    try {
      const result = await Promise.race([generatePromise, timeoutPromise])
      
      console.log('AI排班生成完成')
      return result
    } catch (error) {
      console.error('AI排班生成失败或超时:', error.message)
      
      console.error('AI排班生成错误:', error.message)
      throw error
    }
  }

  // 实际的排班建议生成逻辑
  async doGenerateScheduleSuggestions(scheduleData, userId = null) {
    console.log('=== 实际开始生成AI排班建议 ===')
    const startTime = Date.now()
    
    try {
      // 步骤1: 获取AI配置
      console.log('步骤1: 获取AI配置...')
      console.log('正在获取AI配置...')
      
      const aiConfig = await this.getAIConfig()
      console.log('AI配置:', aiConfig)
      
      if (!aiConfig || !aiConfig.enabled) {
        throw new Error('AI排班服务未启用 - 请在系统设置中启用AI排班')
      }

      const { provider } = aiConfig
      const providerConfig = aiConfig.config[provider]
      console.log('使用AI提供商:', provider)
      console.log('提供商配置存在:', !!providerConfig)
      console.log('API Key存在:', !!providerConfig?.apiKey)

      if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`${provider} API配置不完整 - 请在系统设置中配置API密钥`)
      }

      // 步骤2: 构建排班提示词
      console.log('步骤2: 构建排班提示词...')
      
      const prompt = await this.buildSchedulePrompt(scheduleData, aiConfig.strategy)
      
      if (!prompt || prompt.length === 0) {
        throw new Error('提示词构建失败 - 缺少必要的排班数据')
      }
      
      console.log('提示词构建完成，长度:', prompt.length)

      // 步骤3: 调用AI服务
      console.log('步骤3: 调用AI服务...')
      
      let suggestions
      if (provider === 'deepseek') {
        suggestions = await this.generateWithDeepSeek(providerConfig, prompt, userId)
      } else {
        throw new Error(`不支持的AI提供商: ${provider}`)
      }

      console.log('AI服务调用完成，原始建议:', suggestions)

      if (!suggestions) {
        throw new Error('AI服务返回空结果')
      }

      // 步骤4: 过滤非工作日的排班建议
      console.log('步骤4: 过滤工作日排班建议...')
      
      const filteredSuggestions = await this.filterWorkDaySuggestions(suggestions)
      console.log('过滤后的建议:', filteredSuggestions)

      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}秒`
      const avgConfidence = filteredSuggestions.suggestions?.length > 0
        ? Math.round((filteredSuggestions.suggestions.reduce((sum, s) => sum + (s.confidence || 0.8), 0) / filteredSuggestions.suggestions.length) * 100)
        : 0

      const result = {
        success: true,
        provider: provider,
        strategy: aiConfig.strategy,
        suggestions: filteredSuggestions.suggestions || [],
        analysis: filteredSuggestions.analysis || '',
        conflicts: filteredSuggestions.conflicts || [],
        optimization_notes: filteredSuggestions.optimization_notes || [],
        duration: duration,
        avgConfidence: avgConfidence
      }

      console.log(`AI排班生成完成！生成了${filteredSuggestions.suggestions?.length || 0}个排班建议，耗时${duration}`)

      console.log('=== AI排班建议生成完成 ===')
      console.log('最终结果:', result)
      return result

    } catch (error) {
      console.error('=== AI排班建议生成失败 ===')
      console.error('错误阶段: AI排班建议生成')
      console.error('错误类型:', error.constructor.name)
      console.error('错误信息:', error.message)
      console.error('错误堆栈:', error.stack)
      
      // 返回失败结果而不是抛出错误
      return {
        success: false,
        error: error.message,
        provider: 'unknown',
        strategy: 'unknown',
        suggestions: [],
        analysis: `AI排班生成失败: ${error.message}`,
        conflicts: [error.message],
        optimization_notes: ['请检查AI配置和网络连接']
      }
    }
  }

  // 使用DeepSeek生成排班
  async generateWithDeepSeek(config, prompt, userId = null) {
    console.log('=== DeepSeek API调用开始 ===')
    console.log('DeepSeek配置:', {
      apiUrl: config.apiUrl,
      model: config.model,
      hasApiKey: !!config.apiKey,
      timeout: config.timeout
    })

    // 验证API配置
    if (!config.apiUrl) {
      const defaultUrl = this.providers.deepseek.defaultUrl
      console.log('API URL未配置，使用默认URL:', defaultUrl)
      config.apiUrl = defaultUrl
    }

    if (!config.model) {
      config.model = this.providers.deepseek.defaultModel
      console.log('模型未配置，使用默认模型:', config.model)
    }

    if (!config.apiKey) {
      throw new Error('DeepSeek API Key未配置')
    }

    console.log('最终请求URL:', config.apiUrl)
    console.log('AI提示词长度:', prompt.length)
    console.log('AI提示词内容:', prompt.substring(0, 500) + '...')

    try {
      const requestData = {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的排班助手，能够根据员工可用性和排班规则生成合理的排班方案。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.maxTokens || 2000,
        temperature: 0.7
      }

      console.log('发送到DeepSeek的请求数据:', JSON.stringify(requestData, null, 2))

      // 创建更稳定的请求配置
      const axiosConfig = {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Schedule-System/1.0'
        },
        timeout: config.timeout || 3000000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 300
        }
      }

      console.log('axios配置:', axiosConfig)

      // 使用重试机制
      let lastError
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`DeepSeek API调用尝试 ${attempt}/3`)
          
          // 重试进度
          if (userId && attempt > 1) {
            console.log(`第${attempt}次尝试调用DeepSeek API`)
          }
          
          const response = await axios.post(config.apiUrl, requestData, axiosConfig)
          
          console.log('DeepSeek API响应状态:', response.status)
          console.log('DeepSeek API原始响应:', JSON.stringify(response.data, null, 2))

          if (!response.data || !response.data.choices || !response.data.choices[0]) {
            throw new Error('DeepSeek API响应格式异常')
          }

          const aiContent = response.data.choices[0].message.content
          console.log('AI生成内容:', aiContent)

          const parseResult = this.parseScheduleResponse(aiContent)
          console.log('解析后的排班建议:', JSON.stringify(parseResult, null, 2))
          console.log('=== DeepSeek API调用结束 ===')

          return parseResult
          
        } catch (error) {
          lastError = error
          console.error(`第${attempt}次尝试失败:`, error.message)
          
          if (attempt < 3) {
            console.log(`等待 ${attempt * 1000}ms 后重试...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          }
        }
      }
      
      throw lastError
    } catch (error) {
      console.error('=== DeepSeek API调用失败 ===')
      console.error('错误类型:', error.constructor.name)
      console.error('错误信息:', error.message)
      console.error('错误详情:', error)
      if (error.response) {
        console.error('响应状态:', error.response.status)
        console.error('响应数据:', error.response.data)
      }
      throw error
    }
  }


  // 构建排班提示词
  async buildSchedulePrompt(scheduleData, strategy) {
    const { 
      employees, 
      timeSlots, 
      scheduleRules, 
      existingSchedules, 
      weekStart, 
      weekEnd, 
      requirements = '',
      employeeNotes = {},
      availability = {}
    } = scheduleData

    // 获取工作日设置
    const workDays = await settingsHelper.getWorkDays()
    const workDayNames = settingsHelper.getWorkDayNames()
    const workDayStr = settingsHelper.formatWorkDays(workDays)

    // 计算这周的工作日
    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekEnd)
    const workDaysInWeek = await settingsHelper.getWorkDaysInRange(weekStartDate, weekEndDate)

    console.log('=== 构建AI提示词 ===')
    console.log('员工数量:', employees.length)
    console.log('时间段数量:', timeSlots.length)
    console.log('工作日:', workDayStr)
    console.log('本周工作日期:', workDaysInWeek)

    if (employees.length === 0) {
      console.error('警告: 没有员工数据!')
      return '没有员工数据，无法生成排班建议。'
    }

    if (timeSlots.length === 0) {
      console.error('警告: 没有时间段数据!')
      return '没有时间段数据，无法生成排班建议。'
    }

    let prompt = `请根据以下信息生成排班建议：

**工作日设置：**
- 系统工作日：${workDayStr}
- 本周工作日期：${workDaysInWeek.map(date => 
  `${date.toLocaleDateString('zh-CN')} (${workDayNames[date.getDay() === 0 ? '7' : date.getDay().toString()]})`
).join(', ')}
- **重要：只能为以上工作日生成排班，非工作日不得安排班次**

**员工信息及空闲时间：**`

    employees.forEach(emp => {
      prompt += `\n- ${emp.name} (ID:${emp.id}): 经验等级${emp.experience_level}, 状态${emp.status}`
      
      // 添加员工备注
      if (emp.temporary_notes) {
        prompt += `\n  临时备注: ${emp.temporary_notes}`
      }
      if (employeeNotes[emp.id]) {
        prompt += `\n  排班要求: ${employeeNotes[emp.id]}`
      }
      
      // 添加空闲时间信息
      if (emp.availability && Object.keys(emp.availability).length > 0) {
        prompt += '\n  空闲时间段:'
        Object.keys(emp.availability).forEach(timeSlotId => {
          const timeSlot = timeSlots.find(ts => ts.id == timeSlotId)
          if (timeSlot) {
            const availDates = emp.availability[timeSlotId]
            prompt += `\n    - ${timeSlot.name} (${timeSlot.start_time}-${timeSlot.end_time}): 可用于 ${availDates.map(d => d.date).join(', ')}`
            if (availDates.some(d => d.priority > 3)) {
              prompt += ' [高优先级]'
            }
          }
        })
      } else {
        prompt += '\n  空闲时间: **未设置空闲时间，不能安排值班**'
      }
    })

    prompt += `\n\n**时间段配置（严格限制人员数量）：**
${timeSlots.map(slot => 
  `- ${slot.name} (ID:${slot.id}): ${slot.start_time} - ${slot.end_time}, **最多只能安排${slot.required_people}人，绝不能超过**`
).join('\n')}
**排班规则：**
- 每日最大班次：${scheduleRules.maxShiftsPerDay}
- 每周最大班次：${scheduleRules.maxShiftsPerWeek}
- 最少休息时间：${scheduleRules.minRestHours}小时

**排班策略：**`

    switch (strategy) {
      case 'fair':
        prompt += '\n- 公平分配：尽量让每个员工的班次数相等，考虑工作量平衡'
        break
      case 'priority':
        prompt += '\n- 优先级分配：根据员工空闲时间优先级和可用性进行排班'
        break
      case 'experience':
        prompt += '\n- 经验优化：考虑员工经验等级，让经验丰富的员工承担重要时段'
        break
    }

    // 添加特殊要求
    if (requirements && requirements.trim()) {
      prompt += `\n\n**特殊要求：**\n${requirements}`
    }

    if (existingSchedules && existingSchedules.length > 0) {
      prompt += `\n\n**现有排班：**\n${existingSchedules.map(schedule => 
        `- ${schedule.employee_name}: ${schedule.date} ${schedule.time_slot_name}`
      ).join('\n')}`
    }

    prompt += `\n\n**重要提示：**
1. 必须为以上工作日期生成排班建议
2. **关键约束：只能为有空闲时间的员工安排值班，没有设置空闲时间的员工绝对不能安排值班**
3. **人员数量约束：每个时间段安排的人员数量不能超过该时间段的required_people设置**
4. **如果某个时间段没有员工有空闲时间，该时间段就空着不安排值班**
5. **如果某个时间段有员工有空闲时间，优先安排值班，但不能超过required_people上限**
6. 优先从空闲时间优先级高的员工中选择
7. 为每个排班提供简洁的推荐理由
8. **严格遵循空闲时间约束和人员数量上限，绝不超额安排**

**排班生成算法要求：**
1. 遍历每个工作日期和每个时间段
2. 对于每个时间段，查找有空闲时间的员工
3. **严格按照required_people数量限制选择员工，不多选**
4. 如果可选员工超过required_people，优先选择优先级高的员工
5. 如果可选员工不足required_people，有几个选几个，不要强行凑数

**必须严格按照以下JSON格式返回：**
\`\`\`json
{
  "suggestions": [
    {
      "employee_id": 1,
      "employee_name": "员工姓名",
      "date": "2025-08-12",
      "time_slot_id": 1,
      "time_slot_name": "早班",
      "reason": "基于公平分配原则安排",
      "confidence": 0.85
    }
  ],
  "analysis": "排班分析说明，必须说明如何严格控制了人员数量",
  "conflicts": [],
  "optimization_notes": ["优化建议"]
}
\`\`\`

**最重要：请务必生成具体的排班建议，严格控制每个时间段的人员数量不超过required_people限制。**`

    return prompt
  }

  // 解析排班响应
  parseScheduleResponse(response) {
    console.log('=== 开始解析AI响应 ===')
    console.log('原始响应内容:', response)
    console.log('响应类型:', typeof response)
    console.log('响应长度:', response?.length || 0)
    
    try {
      // 清理响应内容
      const cleanResponse = response.trim()
      
      // 尝试多种JSON提取方式
      let jsonStr = null
      
      // 方式1: 标准的```json代码块
      const jsonCodeBlock = cleanResponse.match(/```json\s*\n([\s\S]*?)\n\s*```/)
      if (jsonCodeBlock) {
        jsonStr = jsonCodeBlock[1].trim()
        console.log('方式1: 找到JSON代码块')
      }
      
      // 方式2: 任意```代码块
      if (!jsonStr) {
        const anyCodeBlock = cleanResponse.match(/```\s*\n([\s\S]*?)\n\s*```/)
        if (anyCodeBlock) {
          jsonStr = anyCodeBlock[1].trim()
          console.log('方式2: 找到代码块')
        }
      }
      
      // 方式3: 直接查找大括号包围的JSON
      if (!jsonStr) {
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
          console.log('方式3: 找到大括号JSON')
        }
      }
      
      // 方式4: 查找最后一个完整的JSON对象
      if (!jsonStr) {
        const lastBraceIndex = cleanResponse.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          const firstBraceIndex = cleanResponse.indexOf('{')
          if (firstBraceIndex !== -1 && firstBraceIndex < lastBraceIndex) {
            jsonStr = cleanResponse.substring(firstBraceIndex, lastBraceIndex + 1)
            console.log('方式4: 找到最后的JSON对象')
          }
        }
      }
      
      if (jsonStr) {
        console.log('提取的JSON字符串:', jsonStr)
        
        // 尝试解析JSON
        const parsed = JSON.parse(jsonStr)
        console.log('成功解析JSON:', parsed)
        
        // 验证解析结果结构
        if (!parsed.suggestions) {
          console.log('警告: 解析结果缺少suggestions字段')
          parsed.suggestions = []
        }
        
        if (!Array.isArray(parsed.suggestions)) {
          console.log('警告: suggestions不是数组，转换为数组')
          parsed.suggestions = []
        }
        
        console.log('最终解析结果:', {
          suggestionCount: parsed.suggestions.length,
          hasAnalysis: !!parsed.analysis,
          hasConflicts: !!parsed.conflicts
        })
        
        return parsed
      } else {
        console.log('未找到有效的JSON内容，返回空建议')
        // 如果没有找到JSON，返回文本分析
        return {
          suggestions: [],
          analysis: response,
          conflicts: [],
          optimization_notes: ['AI响应中未找到有效的JSON格式排班建议']
        }
      }
    } catch (error) {
      console.error('=== 解析AI响应失败 ===')
      console.error('解析错误:', error.message)
      console.error('错误堆栈:', error.stack)
      
      return {
        suggestions: [],
        analysis: response,
        conflicts: ['AI响应解析失败: ' + error.message],
        optimization_notes: ['请检查AI响应格式和JSON语法']
      }
    }
  }

  // 验证排班建议
  async validateScheduleSuggestions(suggestions, rules) {
    const validationResults = []

    for (const suggestion of suggestions) {
      const validation = {
        suggestion: suggestion,
        isValid: true,
        warnings: [],
        errors: []
      }

      // 检查基本字段
      if (!suggestion.employee_id || !suggestion.date || !suggestion.time_slot_id) {
        validation.isValid = false
        validation.errors.push('缺少必要字段')
      }

      // 验证是否为工作日
      if (suggestion.date) {
        const scheduleDate = new Date(suggestion.date)
        const isWorkDay = await settingsHelper.isWorkDay(scheduleDate)
        if (!isWorkDay) {
          validation.isValid = false
          validation.errors.push('该日期不是工作日，不能安排排班')
        }
      }

      // 检查排班规则
      if (rules.maxShiftsPerDay && this.countDailyShifts(suggestions, suggestion.employee_id, suggestion.date) > rules.maxShiftsPerDay) {
        validation.warnings.push('超过每日最大班次限制')
      }

      validationResults.push(validation)
    }

    return validationResults
  }

  // 过滤工作日排班建议
  async filterWorkDaySuggestions(suggestions) {
    if (!suggestions || !suggestions.suggestions) {
      return suggestions
    }

    const filteredSchedules = []
    const filteredOutSchedules = []

    for (const suggestion of suggestions.suggestions) {
      if (suggestion.date) {
        const scheduleDate = new Date(suggestion.date)
        const isWorkDay = await settingsHelper.isWorkDay(scheduleDate)
        
        if (isWorkDay) {
          filteredSchedules.push(suggestion)
        } else {
          filteredOutSchedules.push(suggestion)
        }
      } else {
        filteredSchedules.push(suggestion) // 没有日期的保留
      }
    }

    // 更新建议信息
    const result = {
      ...suggestions,
      suggestions: filteredSchedules
    }

    // 如果有被过滤的排班，添加到分析中
    if (filteredOutSchedules.length > 0) {
      const filteredInfo = `\n\n注意：以下${filteredOutSchedules.length}个排班建议因不在工作日内被过滤：\n` +
        filteredOutSchedules.map(s => `- ${s.employee_name}: ${s.date} ${s.time_slot_name}`).join('\n')
      
      result.analysis = (result.analysis || '') + filteredInfo
      result.optimization_notes = result.optimization_notes || []
      result.optimization_notes.push('已过滤非工作日的排班建议')
    }

    return result
  }

  // 计算员工当日班次数
  countDailyShifts(suggestions, employeeId, date) {
    return suggestions.filter(s => 
      s.employee_id === employeeId && s.date === date
    ).length
  }

  // 获取支持的提供商列表
  getSupportedProviders() {
    return Object.keys(this.providers).map(key => ({
      key,
      name: this.providers[key].name,
      defaultUrl: this.providers[key].defaultUrl,
      defaultModel: this.providers[key].defaultModel
    }))
  }
}

module.exports = new AIService()