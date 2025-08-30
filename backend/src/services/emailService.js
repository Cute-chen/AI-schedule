const nodemailer = require('nodemailer')
const Handlebars = require('handlebars')
const { SystemSettings, EmailTemplate, EmailLog } = require('../models')

class EmailService {
  constructor() {
    this.transporter = null
  }

  // 创建邮件传输器
  async createTransporter(config) {
    const emailConfig = config || await this.getEmailConfig()
    
    if (!emailConfig || !emailConfig.enabled) {
      throw new Error('邮件服务未启用')
    }

    const transportConfig = {
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpSsl,
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPassword
      }
    }

    return nodemailer.createTransport(transportConfig)
  }

  // 获取邮件配置
  async getEmailConfig() {
    try {
      const setting = await SystemSettings.findOne({
        where: { category: 'notification', key: 'email_config' }
      })
      
      return setting ? setting.value : null
    } catch (error) {
      console.error('获取邮件配置失败:', error)
      return null
    }
  }

  // 测试邮件连接
  async testConnection(config) {
    try {
      const transporter = await this.createTransporter(config)
      
      // 验证连接
      await transporter.verify()
      
      // 发送测试邮件
      const testEmail = {
        from: `"${config.fromName || '排班管理系统'}" <${config.smtpUser}>`,
        to: config.smtpUser,
        subject: '邮件服务测试',
        html: `
          <h3>邮件服务测试成功！</h3>
          <p>您的邮件配置工作正常。</p>
          <ul>
            <li><strong>SMTP服务器:</strong> ${config.smtpHost}</li>
            <li><strong>端口:</strong> ${config.smtpPort}</li>
            <li><strong>SSL:</strong> ${config.smtpSsl ? '启用' : '关闭'}</li>
            <li><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN', {
              timeZone: 'Asia/Shanghai',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}</li>
          </ul>
          <hr>
          <small>此邮件由排班管理系统自动发送。</small>
        `
      }

      const result = await transporter.sendMail(testEmail)
      
      return {
        success: true,
        message: '邮件测试发送成功，请检查收件箱',
        data: {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected
        }
      }
    } catch (error) {
      console.error('邮件测试失败:', error)
      return {
        success: false,
        message: `邮件测试失败: ${error.message}`,
        error: error.message
      }
    }
  }

  // 发送邮件
  async sendEmail(options) {
    try {
      const transporter = await this.createTransporter()
      const config = await this.getEmailConfig()
      
      const mailOptions = {
        from: `"${config.fromName || '排班管理系统'}" <${config.smtpUser}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
      }

      const result = await transporter.sendMail(mailOptions)
      
      // 记录邮件发送日志
      await this.logEmail({
        to: options.to,
        subject: options.subject,
        content: options.html,
        status: 'sent',
        message_id: result.messageId,
        event_type: options.eventType
      })

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      }
    } catch (error) {
      console.error('邮件发送失败:', error)
      
      // 记录失败日志
      await this.logEmail({
        to: options.to,
        subject: options.subject,
        content: options.html,
        status: 'failed',
        error_message: error.message,
        event_type: options.eventType
      })

      throw error
    }
  }

  // 使用模板发送邮件
  async sendEmailWithTemplate(templateName, data, recipients) {
    try {
      // 获取邮件模板
      const template = await EmailTemplate.findOne({
        where: { name: templateName, is_active: true }
      })

      if (!template) {
        throw new Error(`邮件模板 '${templateName}' 不存在`)
      }

      // 编译模板
      const subjectTemplate = Handlebars.compile(template.subject)
      const contentTemplate = Handlebars.compile(template.content)

      const subject = subjectTemplate(data)
      const html = contentTemplate(data)

      // 发送邮件给所有收件人
      const results = []
      for (const recipient of recipients) {
        try {
          const result = await this.sendEmail({
            to: recipient,
            subject: subject,
            html: html,
            eventType: template.event_type
          })
          results.push({ recipient, success: true, result })
        } catch (error) {
          results.push({ recipient, success: false, error: error.message })
        }
      }

      return {
        success: true,
        template: templateName,
        results: results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      }
    } catch (error) {
      console.error('模板邮件发送失败:', error)
      throw error
    }
  }


  // 发送调班申请通知
  async sendShiftRequestNotification(shiftRequest) {
    try {
      const notificationConfig = await SystemSettings.findOne({
        where: { category: 'notification', key: 'email_events' }
      })

      if (!notificationConfig || !notificationConfig.value.shiftRequest) {
        return { success: false, message: '调班申请通知已禁用' }
      }

      const templateData = {
        requesterName: shiftRequest.requester.name,
        originalShift: `${shiftRequest.originalSchedule.schedule_date} ${shiftRequest.originalSchedule.timeSlot.name}`,
        targetShift: shiftRequest.target_date + ' ' + (shiftRequest.targetTimeSlot ? shiftRequest.targetTimeSlot.name : '待定'),
        reason: shiftRequest.reason,
        requestTime: new Date(shiftRequest.created_at).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      }

      // 获取管理员邮箱列表
      const adminEmails = await this.getAdminEmails()
      
      if (adminEmails.length === 0) {
        return { success: false, message: '未找到管理员邮箱' }
      }

      return await this.sendEmailWithTemplate(
        '调班申请通知',
        templateData,
        adminEmails
      )
    } catch (error) {
      console.error('发送调班申请通知失败:', error)
      throw error
    }
  }

  // 记录邮件日志
  async logEmail(logData) {
    try {
      await EmailLog.create(logData)
    } catch (error) {
      console.error('记录邮件日志失败:', error)
    }
  }

  // 获取管理员邮箱列表
  async getAdminEmails() {
    try {
      const { Employee } = require('../models')
      const { Op } = require('sequelize')
      const admins = await Employee.findAll({
        where: { 
          role: 'admin',
          email: { [Op.ne]: null }
        },
        attributes: ['email']
      })
      return admins.map(admin => admin.email).filter(email => email)
    } catch (error) {
      console.error('获取管理员邮箱失败:', error)
      return []
    }
  }

  // 发送AI排班通知
  async sendAIScheduleNotification(schedules) {
    try {
      const notificationConfig = await SystemSettings.findOne({
        where: { category: 'notification', key: 'email_events' }
      })

      if (!notificationConfig || !notificationConfig.value.aiScheduleNotification) {
        return { success: false, message: 'AI排班通知已禁用' }
      }

      // 按员工分组排班
      const schedulesByEmployee = schedules.reduce((groups, schedule) => {
        const employeeId = schedule.employee.id
        if (!groups[employeeId]) {
          groups[employeeId] = {
            employee: schedule.employee,
            schedules: []
          }
        }
        groups[employeeId].schedules.push(schedule)
        return groups
      }, {})

      const results = []
      
      // 为每个员工发送一封包含所有排班的邮件
      for (const [employeeId, employeeData] of Object.entries(schedulesByEmployee)) {
        const templateData = {
          employeeName: employeeData.employee.name,
          scheduleCount: employeeData.schedules.length,
          scheduleList: employeeData.schedules.map(schedule => ({
            date: schedule.schedule_date,
            shiftName: schedule.timeSlot.name,
            shiftTime: `${schedule.timeSlot.start_time} - ${schedule.timeSlot.end_time}`,
            location: schedule.location || '默认位置'
          })),
          generatedTime: new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        }

        const result = await this.sendEmailWithTemplate(
          'AI排班通知',
          templateData,
          [employeeData.employee.email]
        )
        
        results.push({
          employee: employeeData.employee.name,
          email: employeeData.employee.email,
          scheduleCount: employeeData.schedules.length,
          result: result
        })
      }

      return {
        success: true,
        message: 'AI排班通知发送完成',
        results: results,
        totalEmployees: Object.keys(schedulesByEmployee).length,
        totalSchedules: schedules.length
      }
    } catch (error) {
      console.error('发送AI排班通知失败:', error)
      throw error
    }
  }

  // 发送调班成功通知
  async sendShiftRequestApprovedNotification(shiftRequest) {
    try {
      const notificationConfig = await SystemSettings.findOne({
        where: { category: 'notification', key: 'email_events' }
      })

      if (!notificationConfig || !notificationConfig.value.shiftRequestApproved) {
        return { success: false, message: '调班成功通知已禁用' }
      }

      const recipients = []
      const results = []

      // 给申请人发送通知
      if (shiftRequest.requester && shiftRequest.requester.email) {
        const requesterTemplateData = {
          employeeName: shiftRequest.requester.name,
          originalShift: `${shiftRequest.originalSchedule.schedule_date} ${shiftRequest.originalSchedule.timeSlot.name}`,
          newShift: shiftRequest.target_date + ' ' + (shiftRequest.targetTimeSlot ? shiftRequest.targetTimeSlot.name : '已调整'),
          approvalDate: new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }),
          approvalNotes: shiftRequest.approval_notes || '无'
        }

        const requesterResult = await this.sendEmailWithTemplate(
          '调班成功通知',
          requesterTemplateData,
          [shiftRequest.requester.email]
        )
        
        results.push({
          recipient: 'requester',
          email: shiftRequest.requester.email,
          name: shiftRequest.requester.name,
          result: requesterResult
        })
      }

      // 如果是换班（swap类型），需要通知受影响的目标员工
      if (shiftRequest.request_type === 'swap' && shiftRequest.target_employee_id) {
        try {
          const { Employee, Schedule } = require('../models')
          
          // 获取目标员工信息
          const targetEmployee = await Employee.findByPk(shiftRequest.target_employee_id)
          
          if (targetEmployee && targetEmployee.email && targetEmployee.id !== shiftRequest.requester_id) {
            const targetTemplateData = {
              employeeName: targetEmployee.name,
              originalShift: shiftRequest.target_date + ' ' + (shiftRequest.targetTimeSlot ? shiftRequest.targetTimeSlot.name : ''),
              newShift: `${shiftRequest.originalSchedule.schedule_date} ${shiftRequest.originalSchedule.timeSlot.name}`,
              approvalDate: new Date().toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }),
              approvalNotes: `与${shiftRequest.requester.name}的换班申请已通过` + (shiftRequest.approval_notes ? `，备注：${shiftRequest.approval_notes}` : '')
            }

            const targetResult = await this.sendEmailWithTemplate(
              '调班成功通知',
              targetTemplateData,
              [targetEmployee.email]
            )
            
            results.push({
              recipient: 'target_employee',
              email: targetEmployee.email,
              name: targetEmployee.name,
              result: targetResult
            })
          }
        } catch (targetError) {
          console.error('发送目标员工调班通知失败:', targetError)
          results.push({
            recipient: 'target_employee',
            error: targetError.message
          })
        }
      }

      return {
        success: true,
        message: '调班成功通知发送完成',
        results: results,
        totalSent: results.filter(r => r.result && r.result.success).length,
        totalFailed: results.filter(r => !r.result || !r.result.success).length
      }
    } catch (error) {
      console.error('发送调班成功通知失败:', error)
      throw error
    }
  }

  // 获取可用的模板变量
  getAvailableVariables(eventType) {
    const variableMap = {
      aiScheduleNotification: ['employeeName', 'scheduleCount', 'scheduleList', 'generatedTime'],
      shiftRequest: ['requesterName', 'originalShift', 'targetShift', 'reason', 'requestTime'],
      shiftRequestApproved: ['employeeName', 'originalShift', 'newShift', 'approvalDate', 'approvalNotes']
    }

    return variableMap[eventType] || []
  }
}

module.exports = new EmailService()