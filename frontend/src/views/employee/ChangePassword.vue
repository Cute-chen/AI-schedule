<template>
  <div class="change-password-container">
    <el-card class="change-password-card">
      <template #header>
        <div class="card-header">
          <h2>🔐 修改密码</h2>
          <p>为了账户安全，请定期修改密码</p>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        size="large"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="form.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            :prefix-icon="Lock"
          />
          <div class="password-tips">
            <p>密码要求：</p>
            <ul>
              <li :class="{ 'valid': passwordChecks.minLength }">至少8个字符</li>
              <li :class="{ 'valid': passwordChecks.hasNumber }">包含数字</li>
              <li :class="{ 'valid': passwordChecks.hasLetter }">包含字母</li>
            </ul>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item>
          <div class="form-actions">
            <el-button @click="handleCancel" size="large">
              取消
            </el-button>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleSubmit"
              size="large"
            >
              {{ loading ? '修改中...' : '修改密码' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import api from '@/services/api'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

// 表单数据
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码强度检查
const passwordChecks = computed(() => ({
  minLength: form.newPassword.length >= 8,
  hasNumber: /\d/.test(form.newPassword),
  hasLetter: /[a-zA-Z]/.test(form.newPassword)
}))

// 表单验证规则
const rules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!passwordChecks.value.hasNumber || !passwordChecks.value.hasLetter) {
          callback(new Error('密码必须包含字母和数字'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    const requestData = {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword
    }

    await api.post('/auth/change-password', requestData)

    ElMessage.success('密码修改成功，请重新登录')
    
    // 延迟跳转到登录页
    setTimeout(async () => {
      await userStore.logout()
      router.push('/login')
    }, 1500)

  } catch (error) {
    console.error('修改密码失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('密码修改失败，请检查当前密码是否正确')
    }
  } finally {
    loading.value = false
  }
}

// 取消操作
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消修改密码吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '继续修改',
      type: 'warning'
    })
    router.back()
  } catch {
    // 用户取消确认框，不做任何操作
  }
}
</script>

<style lang="scss" scoped>
.change-password-container {
  padding: 40px 20px;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 80px;
}

.change-password-card {
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-radius: 12px;

  .card-header {
    text-align: center;
    
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
    }
    
    p {
      margin: 0;
      color: #718096;
      font-size: 14px;
    }
  }
}

.password-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #718096;
  
  p {
    margin: 0 0 4px 0;
    font-weight: 500;
  }
  
  ul {
    margin: 0;
    padding-left: 16px;
    
    li {
      margin: 2px 0;
      color: #e53e3e;
      
      &.valid {
        color: #22c55e;
      }
    }
  }
}

.form-actions {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  
  .el-button {
    flex: 1;
  }
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #374151;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .change-password-container {
    padding: 20px 16px;
    padding-top: 40px;
  }
  
  .change-password-card {
    box-shadow: none;
    border: 1px solid #e4e7ed;
  }
}
</style>