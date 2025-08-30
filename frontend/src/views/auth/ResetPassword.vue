<template>
  <div class="reset-password-container">
    <div class="reset-password-box">
      <div class="reset-password-header">
        <h2 class="reset-password-title">重置密码</h2>
        <p class="reset-password-subtitle">请输入您的新密码</p>
      </div>
      
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        class="reset-password-form"
        @keyup.enter="handleResetPassword"
      >
        <el-form-item prop="password">
          <el-input
            v-model="resetPasswordForm.password"
            type="password"
            placeholder="请输入新密码"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            :loading="loading"
            type="primary"
            size="large"
            class="reset-password-button"
            @click="handleResetPassword"
          >
            <span v-if="!loading">重置密码</span>
            <span v-else>重置中...</span>
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="reset-password-footer">
        <el-link type="primary" @click="goToLogin">返回登录</el-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// 表单引用
const resetPasswordFormRef = ref()

// 加载状态
const loading = ref(false)

// 重置密码表单数据
const resetPasswordForm = reactive({
  password: '',
  confirmPassword: ''
})

// 表单验证规则
const resetPasswordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetPasswordForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 处理重置密码
const handleResetPassword = async () => {
  try {
    // 表单验证
    await resetPasswordFormRef.value.validate()
    
    const token = route.query.token
    if (!token) {
      ElMessage.error('重置链接无效')
      return
    }
    
    loading.value = true
    
    // 调用重置密码API
    await axios.post('/api/auth/reset-password', {
      token: token,
      password: resetPasswordForm.password
    })
    
    ElMessage.success('密码重置成功，请使用新密码登录')
    
    // 跳转到登录页面
    router.push('/login')
    
  } catch (error) {
    console.error('Reset password failed:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('重置失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

// 返回登录页面
const goToLogin = () => {
  router.push('/login')
}

// 组件挂载时检查token
onMounted(() => {
  const token = route.query.token
  if (!token) {
    ElMessage.error('重置链接无效或已过期')
    router.push('/login')
  }
})
</script>

<style lang="scss" scoped>
.reset-password-container {
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

.reset-password-box {
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

.reset-password-header {
  text-align: center;
  margin-bottom: 32px;
  
  .reset-password-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }
  
  .reset-password-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.reset-password-form {
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .reset-password-button {
    width: 100%;
    height: 44px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
  }
}

.reset-password-footer {
  margin-top: 24px;
  text-align: center;
}

// 响应式设计
@media (max-width: 480px) {
  .reset-password-box {
    width: 90%;
    padding: 24px;
    margin: 20px;
  }
  
  .reset-password-header {
    .reset-password-title {
      font-size: 24px;
    }
  }
}
</style>