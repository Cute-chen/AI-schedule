<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2 class="login-title">排班管理系统</h2>
        <p class="login-subtitle">智能排班，高效管理</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="请输入邮箱"
            prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="captcha">
          <Captcha
            ref="captchaRef"
            v-model="loginForm.captcha"
            @refresh="handleCaptchaRefresh"
          />
        </el-form-item>
        
        <el-form-item>
          <div class="login-options">
            <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
            <el-link type="primary" @click="goToForgotPassword">忘记密码？</el-link>
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button
            :loading="loginLoading"
            type="primary"
            size="large"
            class="login-button"
            @click="handleLogin"
          >
            <span v-if="!loginLoading">登录</span>
            <span v-else>登录中...</span>
          </el-button>
        </el-form-item>
        
        <div class="register-link">
          <span>还没有账户？</span>
          <el-link type="primary" @click="goToRegister">员工自助注册</el-link>
        </div>
      </el-form>
      
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import Captcha from '@/components/Captcha.vue'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const loginFormRef = ref()
const captchaRef = ref()

// 加载状态
const loginLoading = ref(false)

// 登录表单数据
const loginForm = reactive({
  email: '',
  password: '',
  captcha: '',
  remember: false
})

// 表单验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码必须为4位', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async () => {
  try {
    // 表单验证
    await loginFormRef.value.validate()
    
    // 验证码验证
    if (!captchaRef.value.validate()) {
      ElMessage.error('验证码错误，请重新输入')
      captchaRef.value.refresh()
      loginForm.captcha = ''
      return
    }
    
    loginLoading.value = true
    
    // 调用登录API
    const response = await userStore.login({
      email: loginForm.email,
      password: loginForm.password,
      remember: loginForm.remember
    })
    
    console.log('Login response:', response)
    console.log('User store after login:', {
      isAuthenticated: userStore.isAuthenticated,
      userInfo: userStore.userInfo,
      token: userStore.token
    })
    
    ElMessage.success('登录成功')
    
    // 使用store中的用户角色信息进行跳转，确保用户信息已经设置
    const userRole = userStore.userInfo?.role
    console.log('User role for redirect:', userRole)
    
    if (userRole === 'admin') {
      console.log('Redirecting to admin dashboard')
      await router.push('/admin/dashboard')
    } else if (userRole === 'employee') {
      console.log('Redirecting to employee dashboard')
      await router.push('/employee/dashboard')
    } else {
      console.log('Redirecting to root path for role determination')
      await router.push('/')
    }
    
  } catch (error) {
    console.error('Login failed:', error)
    ElMessage.error(error.message || '登录失败')
    // 登录失败后刷新验证码
    captchaRef.value.refresh()
    loginForm.captcha = ''
  } finally {
    loginLoading.value = false
  }
}

// 处理验证码刷新
const handleCaptchaRefresh = (newCode) => {
  console.log('验证码已刷新:', newCode)
}

// 跳转到忘记密码页面
const goToForgotPassword = () => {
  router.push('/forgot-password')
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/register')
}

// 组件挂载时检查是否已登录
onMounted(() => {
  if (userStore.isLoggedIn) {
    router.push('/')
  }
})
</script>

<style lang="scss" scoped>
.login-container {
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

.login-box {
  position: relative;
  z-index: 1;
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  
  .login-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }
  
  .login-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .login-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .login-button {
    width: 100%;
    height: 44px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
  }
}

.register-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #606266;
  
  .el-link {
    margin-left: 8px;
  }
}


// 响应式设计
@media (max-width: 480px) {
  .login-box {
    width: 90%;
    padding: 24px;
    margin: 20px;
  }
  
  .login-header {
    .login-title {
      font-size: 24px;
    }
  }
  
}
</style>