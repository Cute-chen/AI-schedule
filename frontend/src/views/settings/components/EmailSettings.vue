<template>
  <div class="email-settings">
    <el-row :gutter="20">
      <!-- 邮件服务配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Message /></el-icon>
              <span>邮件服务配置</span>
            </div>
          </template>

          <el-form :model="emailConfig" label-width="120px" ref="emailFormRef" :rules="emailRules">
            <el-form-item label="启用邮件" required>
              <el-switch v-model="emailConfig.enabled" />
              <span class="form-tip">开启后会向员工发送排班和调班通知</span>
            </el-form-item>

            <template v-if="emailConfig.enabled">
              <el-form-item label="SMTP服务器" prop="smtpHost" required>
                <el-input 
                  v-model="emailConfig.smtpHost" 
                  placeholder="例如: smtp.qq.com"
                />
              </el-form-item>

              <el-form-item label="SMTP端口" prop="smtpPort" required>
                <el-input-number 
                  v-model="emailConfig.smtpPort" 
                  :min="1" 
                  :max="65535"
                  placeholder="例如: 587"
                  style="width: 120px"
                />
                <span class="form-tip">常用端口: 25, 465, 587, 993</span>
              </el-form-item>

              <el-form-item label="发送邮箱" prop="smtpUser" required>
                <el-input 
                  v-model="emailConfig.smtpUser" 
                  placeholder="系统发送邮件的邮箱地址"
                />
              </el-form-item>

              <el-form-item label="邮箱密码" prop="smtpPassword" required>
                <el-input 
                  v-model="emailConfig.smtpPassword" 
                  type="password" 
                  show-password
                  placeholder="邮箱授权码或密码"
                />
              </el-form-item>

              <el-form-item label="发件人名称">
                <el-input 
                  v-model="emailConfig.fromName" 
                  placeholder="邮件发送者显示名称"
                />
              </el-form-item>

              <el-form-item label="使用SSL">
                <el-switch v-model="emailConfig.smtpSsl" />
                <span class="form-tip">推荐开启以提高安全性</span>
              </el-form-item>

              <el-form-item>
                <el-button 
                  type="success" 
                  @click="testEmailConnection"
                  :loading="testing"
                >
                  测试邮件配置
                </el-button>
                <span class="form-tip">点击测试邮件服务器连接</span>
              </el-form-item>
            </template>
          </el-form>
        </el-card>
      </el-col>

      <!-- 通知事件配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Bell /></el-icon>
              <span>通知事件配置</span>
            </div>
          </template>

          <el-form :model="emailEvents" label-width="140px">
            <el-form-item label="AI排班通知">
              <el-switch v-model="emailEvents.aiScheduleNotification" />
              <span class="form-tip">AI生成排班后通知相关员工</span>
            </el-form-item>

            <el-form-item label="调班申请通知">
              <el-switch v-model="emailEvents.shiftRequest" />
              <span class="form-tip">有新的调班申请时通知管理员</span>
            </el-form-item>

            <el-form-item label="调班成功通知">
              <el-switch v-model="emailEvents.shiftRequestApproved" />
              <span class="form-tip">调班申请被批准时通知申请人和受影响的员工</span>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 邮件模板管理 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>邮件模板管理</span>
              <el-button type="primary" size="small" @click="showTemplateDialog" style="margin-left: auto;">
                创建模板
              </el-button>
            </div>
          </template>

          <el-table :data="emailTemplates" style="width: 100%" v-loading="templatesLoading">
            <el-table-column prop="name" label="模板名称" width="150" />
            <el-table-column prop="event_type" label="事件类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getEventTypeTag(row.event_type)">
                  {{ getEventTypeName(row.event_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="subject" label="邮件主题" />
            <el-table-column prop="is_default" label="默认" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.is_default" type="success" size="small">默认</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="is_active" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="editTemplate(row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteTemplate(row)" :disabled="row.is_default">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 保存按钮 -->
    <div class="save-section">
      <el-button 
        type="primary" 
        size="large"
        @click="saveSettings"
        :loading="loading"
      >
        保存通知设置
      </el-button>
      <el-button 
        size="large"
        @click="resetSettings"
      >
        重置
      </el-button>
    </div>

    <!-- 邮件模板编辑对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      :title="templateForm.id ? '编辑邮件模板' : '创建邮件模板'"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form :model="templateForm" label-width="100px" ref="templateFormRef" :rules="templateRules">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>

        <el-form-item label="事件类型" prop="event_type">
          <el-select v-model="templateForm.event_type" placeholder="选择事件类型" style="width: 100%">
            <el-option label="AI排班通知" value="aiScheduleNotification" />
            <el-option label="调班申请通知" value="shiftRequest" />
            <el-option label="调班成功通知" value="shiftRequestApproved" />
          </el-select>
        </el-form-item>

        <el-form-item label="邮件主题" prop="subject">
          <el-input v-model="templateForm.subject" placeholder="请输入邮件主题" />
          <div class="form-tip">可使用变量: {{employeeName}}, {{date}} 等</div>
        </el-form-item>

        <el-form-item label="邮件内容" prop="content">
          <el-input
            v-model="templateForm.content"
            type="textarea"
            :rows="8"
            placeholder="请输入邮件内容，支持HTML格式"
          />
        </el-form-item>
        <el-form-item label="可用变量">
          <el-tag
           v-for="variable in getAvailableVariables(templateForm.event_type)"
          :key="variable"
           type="info"
           size="small"
         style="margin: 2px"
        >
        {{ '&#123;&#123;' + variable + '&#125;&#125;' }}
        </el-tag>
</el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="templateForm.is_default" />
        </el-form-item>

        <el-form-item label="启用模板">
          <el-switch v-model="templateForm.is_active" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="templateSaving">
          {{ templateForm.id ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settingsApi } from '@/services/api'

const emit = defineEmits(['save', 'test'])
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 注入全局设置
const allSettings = inject('settings')

// 邮件配置
const emailConfig = reactive({
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpSsl: true,
  fromName: '排班管理系统'
})

// 通知事件配置
const emailEvents = reactive({
  aiScheduleNotification: true,
  shiftRequest: true,
  shiftRequestApproved: true
})

// 邮件模板
const emailTemplates = ref([])
const templatesLoading = ref(false)

// 测试状态
const testing = ref(false)

// 模板对话框
const templateDialogVisible = ref(false)
const templateSaving = ref(false)
const templateForm = reactive({
  id: null,
  name: '',
  subject: '',
  content: '',
  event_type: '',
  is_default: false,
  is_active: true
})

// 表单验证规则
const emailRules = {
  smtpHost: [{ required: true, message: '请输入SMTP服务器', trigger: 'blur' }],
  smtpPort: [{ required: true, message: '请输入SMTP端口', trigger: 'blur' }],
  smtpUser: [
    { required: true, message: '请输入发送邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  smtpPassword: [{ required: true, message: '请输入邮箱密码', trigger: 'blur' }]
}

const templateRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  event_type: [{ required: true, message: '请选择事件类型', trigger: 'blur' }],
  subject: [{ required: true, message: '请输入邮件主题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入邮件内容', trigger: 'blur' }]
}

// 测试邮件连接
const testEmailConnection = () => {
  emit('test', { ...emailConfig })
  testing.value = true
  setTimeout(() => {
    testing.value = false
  }, 3000)
}

// 获取事件类型显示名称
const getEventTypeName = (type) => {
  const names = {
    aiScheduleNotification: 'AI排班通知',
    shiftRequest: '调班申请通知',
    shiftRequestApproved: '调班成功通知'
  }
  return names[type] || type
}

// 获取事件类型标签类型
const getEventTypeTag = (type) => {
  const tags = {
    aiScheduleNotification: 'primary',
    shiftRequest: 'warning',
    shiftRequestApproved: 'success'
  }
  return tags[type] || 'info'
}

// 获取可用变量
const getAvailableVariables = (eventType) => {
  const variableMap = {
    aiScheduleNotification: ['employeeName', 'scheduleCount', 'scheduleList', 'generatedTime'],
    shiftRequest: ['requesterName', 'originalShift', 'targetShift', 'reason', 'requestTime'],
    shiftRequestApproved: ['employeeName', 'originalShift', 'newShift', 'approvalDate', 'approvalNotes']
  }
  return variableMap[eventType] || []
}

// 加载邮件模板
const loadEmailTemplates = async () => {
  try {
    templatesLoading.value = true
    const response = await settingsApi.getEmailTemplates()
    emailTemplates.value = response.data
  } catch (error) {
    console.error('加载邮件模板失败:', error)
    ElMessage.error('加载邮件模板失败')
  } finally {
    templatesLoading.value = false
  }
}

// 显示模板对话框
const showTemplateDialog = () => {
  Object.assign(templateForm, {
    id: null,
    name: '',
    subject: '',
    content: '',
    event_type: '',
    is_default: false,
    is_active: true
  })
  templateDialogVisible.value = true
}

// 编辑模板
const editTemplate = (template) => {
  Object.assign(templateForm, template)
  templateDialogVisible.value = true
}

// 保存模板
const saveTemplate = async () => {
  try {
    templateSaving.value = true
    
    console.log('提交的模板数据:', templateForm)
    
    if (templateForm.id) {
      await settingsApi.updateEmailTemplate(templateForm.id, templateForm)
      ElMessage.success('模板更新成功')
    } else {
      await settingsApi.createEmailTemplate(templateForm)
      ElMessage.success('模板创建成功')
    }
    
    templateDialogVisible.value = false
    await loadEmailTemplates()
  } catch (error) {
    console.error('保存模板详细错误:', error)
    ElMessage.error(`保存模板失败: ${error.response?.data?.message || error.message}`)
  } finally {
    templateSaving.value = false
  }
}

// 删除模板
const deleteTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板 "${template.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await settingsApi.deleteEmailTemplate(template.id)
    ElMessage.success('模板删除成功')
    await loadEmailTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error('删除模板失败')
    }
  }
}

// 保存设置
const saveSettings = () => {
  const notificationData = {
    email_config: emailConfig,
    email_events: emailEvents
  }
  
  emit('save', 'notification', notificationData)
}

// 重置设置
const resetSettings = () => {
  Object.assign(emailConfig, {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSsl: true,
    fromName: '排班管理系统'
  })
  
  Object.assign(emailEvents, {
    aiScheduleNotification: true,
    shiftRequest: true,
    shiftRequestApproved: true
  })
}

// 初始化设置
const initSettings = () => {
  const notificationSettings = allSettings.value.notification
  
  if (notificationSettings.email_config) {
    Object.assign(emailConfig, notificationSettings.email_config)
  }
  
  if (notificationSettings.email_events) {
    Object.assign(emailEvents, notificationSettings.email_events)
  }
}

onMounted(() => {
  initSettings()
  loadEmailTemplates()
})

// 监听设置数据变化
watch(() => allSettings.value.notification, (newSettings) => {
  if (newSettings && Object.keys(newSettings).length > 0) {
    initSettings()
  }
}, { deep: true })
</script>

<style lang="scss" scoped>
.email-settings {
  .card-header {
    display: flex;
    align-items: center;
    font-weight: 600;
    
    .el-icon {
      margin-right: 8px;
      color: #409eff;
    }
  }
}

.save-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
  text-align: center;
  
  .el-button {
    margin: 0 10px;
  }
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}
</style>