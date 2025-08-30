<template>
  <div class="forgot-password-container">
    <div class="forgot-password-box">
      <div class="forgot-password-header">
        <h2 class="forgot-password-title">忘记密码</h2>
        <p class="forgot-password-subtitle">请输入您的邮箱地址，我们将发送重置链接到您的邮箱</p>
      </div>
      
      <el-form
        ref="forgotPasswordFormRef"
        :model="forgotPasswordForm"
        :rules="forgotPasswordRules"
        class="forgot-password-form"
        @keyup.enter="handleForgotPassword"
      >
        <el-form-item prop="email">
          <el-input
            v-model="forgotPasswordForm.email"
            placeholder="请输入邮箱"
            prefix-icon="Message"
            size="large"
            clearable
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            :loading="loading"
            type="primary"
            size="large"
            class="forgot-password-button"
            @click="handleForgotPassword"
          >
            <span v-if="!loading">发送重置链接</span>
            <span v-else>发送中...</span>
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="forgot-password-footer">
        <el-link type="primary" @click="goToLogin">返回登录</el-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

// 表单引用
const forgotPasswordFormRef = ref()

// 加载状态
const loading = ref(false)

// 忘记密码表单数据
const forgotPasswordForm = reactive({
  email: ''
})

// 表单验证规则
const forgotPasswordRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 处理忘记密码
const handleForgotPassword = async () => {
  try {
    // 表单验证
    await forgotPasswordFormRef.value.validate()
    
    loading.value = true
    
    // 调用忘记密码API
    await axios.post('/api/auth/forgot-password', {
      email: forgotPasswordForm.email
    })
    
    ElMessage.success('重置链接已发送到您的邮箱，请查收')
    
    // 清空表单
    forgotPasswordForm.email = ''
    
  } catch (error) {
    console.error('Forgot password failed:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('发送失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

// 返回登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.forgot-password-container {
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

.forgot-password-box {
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

.forgot-password-header {
  text-align: center;
  margin-bottom: 32px;
  
  .forgot-password-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }
  
  .forgot-password-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
    line-height: 1.5;
  }
}

.forgot-password-form {
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .forgot-password-button {
    width: 100%;
    height: 44px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
  }
}

.forgot-password-footer {
  margin-top: 24px;
  text-align: center;
}

// 响应式设计
@media (max-width: 480px) {
  .forgot-password-box {
    width: 90%;
    padding: 24px;
    margin: 20px;
  }
  
  .forgot-password-header {
    .forgot-password-title {
      font-size: 24px;
    }
  }
}
</style>