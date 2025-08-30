<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h2 class="register-title">员工自助注册</h2>
        <p class="register-subtitle">通过同事推荐加入排班系统</p>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="name">
          <el-input
            v-model="registerForm.name"
            placeholder="请输入您的真实姓名"
            prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            type="email"
            placeholder="请输入邮箱地址"
            prefix-icon="Message"
            size="large"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请设置登录密码（至少6位）"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请确认登录密码"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="phone">
          <el-input
            v-model="registerForm.phone"
            placeholder="请输入手机号码"
            prefix-icon="Phone"
            size="large"
            clearable
          />
        </el-form-item>
        
        
        <el-form-item prop="referrerEmail">
          <el-input
            v-model="registerForm.referrerEmail"
            type="email"
            placeholder="请输入推荐人邮箱地址"
            prefix-icon="UserFilled"
            size="large"
            clearable
            @blur="validateReferrerEmail"
          >
            <template #suffix>
              <el-icon v-if="referrerValidating" class="is-loading">
                <Loading />
              </el-icon>
              <el-icon v-else-if="referrerValid === true" color="#67c23a">
                <CircleCheck />
              </el-icon>
              <el-icon v-else-if="referrerValid === false" color="#f56c6c">
                <CircleClose />
              </el-icon>
            </template>
          </el-input>
          <div v-if="referrerInfo" class="referrer-info">
            <span class="referrer-name">推荐人：{{ referrerInfo.name }}</span>
          </div>
        </el-form-item>
        
        <el-form-item prop="captcha">
          <Captcha
            ref="captchaRef"
            v-model="registerForm.captcha"
            @refresh="handleCaptchaRefresh"
          />
        </el-form-item>
        
        <el-form-item>
          <div class="register-agreement">
            <el-checkbox v-model="registerForm.agreement">
              我已阅读并同意遵守公司排班管理规定
            </el-checkbox>
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button
            :loading="registerLoading"
            type="primary"
            size="large"
            class="register-button"
            @click="handleRegister"
          >
            <span v-if="!registerLoading">提交注册申请</span>
            <span v-else>提交中...</span>
          </el-button>
        </el-form-item>
        
        <div class="login-link">
          <span>已有账户？</span>
          <el-link type="primary" @click="goToLogin">返回登录</el-link>
        </div>
      </el-form>
      
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue'
import Captcha from '@/components/Captcha.vue'
import { authAPI, employeeApi } from '@/services/api'

const router = useRouter()

// 表单引用
const registerFormRef = ref()
const captchaRef = ref()

// 加载状态
const registerLoading = ref(false)
const referrerValidating = ref(false)
const referrerValid = ref(null)
const referrerInfo = ref(null)

// 注册表单数据
const registerForm = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  referrerEmail: '',
  captcha: '',
  agreement: false
})

// 密码确认验证
const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请确认密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 推荐人邮箱验证
const validateReferrerEmailRule = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入推荐人邮箱'))
  } else if (referrerValid.value === false) {
    callback(new Error('推荐人不存在或无效'))
  } else if (referrerValid.value === null) {
    callback(new Error('请等待推荐人验证'))
  } else {
    callback()
  }
}

// 协议验证
const validateAgreement = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请同意公司排班管理规定'))
  } else {
    callback()
  }
}

// 表单验证规则
const registerRules = {
  name: [
    { required: true, message: '请输入您的姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '姓名长度应在2-50个字符之间', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  referrerEmail: [
    { validator: validateReferrerEmailRule, trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码必须为4位', trigger: 'blur' }
  ],
  agreement: [
    { validator: validateAgreement, trigger: 'change' }
  ]
}

// 验证推荐人邮箱
const validateReferrerEmail = async () => {
  const email = registerForm.referrerEmail.trim()
  
  if (!email) {
    referrerValid.value = null
    referrerInfo.value = null
    return
  }
  
  // 检查邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    referrerValid.value = false
    referrerInfo.value = null
    return
  }
  
  // 检查不能推荐自己
  if (email === registerForm.email.trim()) {
    ElMessage.warning('不能填写自己的邮箱作为推荐人')
    referrerValid.value = false
    referrerInfo.value = null
    return
  }
  
  try {
    referrerValidating.value = true
    referrerValid.value = null
    referrerInfo.value = null
    
    // 调用API验证推荐人
    const response = await employeeApi.validateReferrer({ email })
    
    if (response.success && response.data.valid) {
      referrerValid.value = true
      referrerInfo.value = response.data.employee
      ElMessage.success(`推荐人验证成功：${response.data.employee.name}`)
    } else {
      referrerValid.value = false
      referrerInfo.value = null
      ElMessage.error(response.message || '推荐人不存在或无效')
    }
  } catch (error) {
    console.error('验证推荐人失败:', error)
    referrerValid.value = false
    referrerInfo.value = null
    ElMessage.error('推荐人验证失败，请重试')
  } finally {
    referrerValidating.value = false
  }
}

// 处理注册
const handleRegister = async () => {
  try {
    // 表单验证
    await registerFormRef.value.validate()
    
    // 验证码验证
    if (!captchaRef.value.validate()) {
      ElMessage.error('验证码错误，请重新输入')
      captchaRef.value.refresh()
      registerForm.captcha = ''
      return
    }
    
    registerLoading.value = true
    
    // 调用注册API
    const response = await authAPI.selfRegister({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      phone: registerForm.phone,
      referrerEmail: registerForm.referrerEmail
    })
    
    ElMessage.success('注册申请提交成功！请等待管理员审核。')
    
    // 3秒后跳转到登录页面
    setTimeout(() => {
      router.push('/login')
    }, 3000)
    
  } catch (error) {
    console.error('Registration failed:', error)
    ElMessage.error(error.message || '注册失败，请重试')
    // 注册失败后刷新验证码
    captchaRef.value.refresh()
    registerForm.captcha = ''
  } finally {
    registerLoading.value = false
  }
}

// 处理验证码刷新
const handleCaptchaRefresh = (newCode) => {
  console.log('验证码已刷新:', newCode)
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.register-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
}

.register-box {
  position: relative;
  z-index: 1;
  width: 480px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
  
  .register-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }
  
  .register-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.register-form {
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .register-agreement {
    width: 100%;
    
    .el-checkbox {
      font-size: 14px;
    }
  }
  
  .register-button {
    width: 100%;
    height: 44px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
  }
  
  .login-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: #606266;
    
    .el-link {
      margin-left: 8px;
    }
  }
}

.referrer-info {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border-left: 4px solid #67c23a;
  
  .referrer-name {
    font-size: 13px;
    color: #67c23a;
    font-weight: 500;
  }
}

// 响应式设计
@media (max-width: 520px) {
  .register-box {
    width: 90%;
    padding: 24px;
    margin: 20px;
  }
  
  .register-header {
    .register-title {
      font-size: 24px;
    }
  }
}
</style>