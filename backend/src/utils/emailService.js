const nodemailer = require('nodemailer')
const logger = require('./logger')
const { SystemSettings } = require('../models')

/**
 * 获取邮件配置
 */
const getEmailConfig = async () => {
  try {
    const emailConfigSetting = await SystemSettings.findOne({
      where: { 
        category: 'notification',
        key: 'email_config',
        is_active: true
      }
    })
    
    if (!emailConfigSetting) {
      throw new Error('邮件配置未找到')
    }
    
    const config = emailConfigSetting.value
    
    if (!config.enabled) {
      throw new Error('邮件服务未启用')
    }
    
    return config
  } catch (error) {
    logger.error('Failed to get email config', { error: error.message })
    throw error
  }
}

/**
 * 创建邮件传输器
 */
const createTransporter = async () => {
  const config = await getEmailConfig()
  
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSsl, // true for SSL, false for STARTTLS
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword
    }
  })
}

/**
 * 发送邮件
 * @param {object} options 邮件选项
 * @param {string} options.to 收件人邮箱
 * @param {string} options.subject 邮件主题
 * @param {string} options.html HTML内容
 * @param {string} options.text 纯文本内容
 */
const sendEmail = async (options) => {
  try {
    const config = await getEmailConfig()
    const transporter = await createTransporter()
    
    const fromName = config.fromName && config.fromName !== '??????' ? config.fromName : '排班管理系统'
    const mailOptions = {
      from: `"${fromName}" <${config.smtpUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    }

    const result = await transporter.sendMail(mailOptions)
    
    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      messageId: result.messageId
    })
    
    return result
  } catch (error) {
    logger.error('Email sending failed', {
      error: error.message,
      to: options.to,
      subject: options.subject
    })
    throw error
  }
}

/**
 * 获取网站URL配置
 */
const getWebsiteUrl = async () => {
  try {
    const websiteUrlSetting = await SystemSettings.findOne({
      where: { 
        category: 'general',
        key: 'website_url',
        is_active: true
      }
    })
    
    if (websiteUrlSetting && websiteUrlSetting.value.url) {
      return websiteUrlSetting.value.url
    }
    
    // 默认值
    return 'http://8.138.227.145:3000'
  } catch (error) {
    logger.warn('Failed to get website URL, using default', { error: error.message })
    return 'http://8.138.227.145:3000'
  }
}

/**
 * 发送密码重置邮件
 * @param {string} email 收件人邮箱
 * @param {string} resetToken 重置令牌
 * @param {string} userName 用户名
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const websiteUrl = await getWebsiteUrl()
  const resetUrl = `${websiteUrl}/reset-password?token=${resetToken}`
  
  const subject = '密码重置请求 - 排班管理系统'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>密码重置</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>排班管理系统</h1>
                <p>密码重置请求</p>
            </div>
            <div class="content">
                <h2>您好，${userName}！</h2>
                <p>我们收到了您的密码重置请求。如果这是您本人的操作，请点击下面的按钮重置您的密码：</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">重置密码</a>
                </div>
                
                <p>或者复制以下链接到浏览器地址栏：</p>
                <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                
                <div class="warning">
                    <strong>重要提示：</strong>
                    <ul>
                        <li>此链接将在1小时后失效</li>
                        <li>如果这不是您本人的操作，请忽略此邮件</li>
                        <li>为了您的账户安全，请不要将此链接分享给他人</li>
                    </ul>
                </div>
                
                <p>如果您有任何疑问，请联系系统管理员。</p>
            </div>
            <div class="footer">
                <p>此邮件由系统自动发送，请勿回复。</p>
                <p>&copy; 2024 排班管理系统. 保留所有权利.</p>
            </div>
        </div>
    </body>
    </html>
  `
  
  const text = `
    排班管理系统 - 密码重置请求
    
    您好，${userName}！
    
    我们收到了您的密码重置请求。请访问以下链接重置您的密码：
    
    ${resetUrl}
    
    重要提示：
    - 此链接将在1小时后失效
    - 如果这不是您本人的操作，请忽略此邮件
    - 为了您的账户安全，请不要将此链接分享给他人
    
    如果您有任何疑问，请联系系统管理员。
    
    此邮件由系统自动发送，请勿回复。
  `
  
  return await sendEmail({
    to: email,
    subject,
    html,
    text
  })
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail
}