<template>
  <div class="settings-container">
    <div class="page-header">
      <h1>系统设置</h1>
      <p>配置系统参数、邮件通知和AI服务</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="settings-tabs">
      <!-- 基本设置 -->
      <el-tab-pane label="基本设置" name="general" lazy>
        <GeneralSettings @save="handleSave" :loading="saving" />
      </el-tab-pane>


      <!-- 通知设置 -->
      <el-tab-pane label="通知设置" name="notification" lazy>
        <EmailSettings @save="handleSave" @test="handleEmailTest" :loading="saving" />
      </el-tab-pane>

      <!-- AI设置 -->
      <el-tab-pane label="AI设置" name="ai" lazy>
        <AISettings @save="handleSave" @test="handleAITest" :loading="saving" />
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settingsApi } from '@/services/api'
import GeneralSettings from './components/GeneralSettings.vue'
import EmailSettings from './components/EmailSettings.vue'
import AISettings from './components/AISettings.vue'

const activeTab = ref('general')
const saving = ref(false)
const allSettings = ref({
  general: {},
  notification: {},
  ai: {}
})

// 提供设置数据给子组件
provide('settings', allSettings)

// 保存设置
const handleSave = async (category, data) => {
  try {
    saving.value = true
    
    // 保存设置
    await settingsApi.updateSettings(category, data)
    
    // 重新加载该分类的设置数据
    await loadCategorySettings(category)
    
    ElMessage.success(`${getCategoryName(category)}设置已保存`)
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 加载特定分类的设置
const loadCategorySettings = async (category) => {
  try {
    const response = await settingsApi.getSettingsByCategory(category)
    allSettings.value[category] = response.data
  } catch (error) {
    console.error(`加载${category}设置失败:`, error)
  }
}

// 测试邮件配置
const handleEmailTest = async (config) => {
  try {
    const result = await settingsApi.testEmail(config)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    console.error('邮件测试失败:', error)
    ElMessage.error('邮件测试失败，请检查配置')
  }
}

// 测试AI配置
const handleAITest = async (provider, config) => {
  try {
    const result = await settingsApi.testAIConnection(provider, config)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    console.error('AI测试失败:', error)
    ElMessage.error('AI连接测试失败，请检查配置')
  }
}

// 获取分类显示名称
const getCategoryName = (category) => {
  const names = {
    general: '基本',
    notification: '通知',
    ai: 'AI'
  }
  return names[category] || category
}

// 加载所有设置
const loadAllSettings = async () => {
  try {
    const response = await settingsApi.getSettings()
    allSettings.value = response.data
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.error('加载设置失败')
  }
}

onMounted(() => {
  loadAllSettings()
})
</script>

<style lang="scss" scoped>
.settings-container {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
  
  h1 {
    margin: 0 0 8px 0;
    color: #303133;
    font-size: 24px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    color: #606266;
    font-size: 14px;
  }
}

.settings-tabs {
  min-height: 600px;
  
  :deep(.el-tab-pane) {
    padding: 20px;
  }
  
  :deep(.el-tabs__header) {
    background-color: #f5f7fa;
  }
  
  :deep(.el-tabs__item) {
    padding: 0 20px;
    font-weight: 500;
    
    &.is-active {
      color: #409eff;
    }
  }
}

:deep(.el-card) {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.form-tip) {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

:deep(.section-title) {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}
</style>