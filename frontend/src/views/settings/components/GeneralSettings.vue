<template>
  <div class="general-settings">
    <!-- 系统设置 -->
    <el-card class="settings-card">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Calendar /></el-icon>
              <span>系统设置</span>
            </div>
          </template>

          <el-form :model="systemSettings" label-width="120px" ref="systemFormRef">
            <el-form-item label="周起始日期">
              <el-date-picker
                v-model="systemSettings.weekStartDate"
                type="date"
                placeholder="选择第一周开始日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
              <div class="form-tip">设置排班系统的周起始日期</div>
            </el-form-item>

            <el-form-item label="工作日设置">
              <el-checkbox-group v-model="systemSettings.workDays">
                <el-checkbox label="1">周一</el-checkbox>
                <el-checkbox label="2">周二</el-checkbox>
                <el-checkbox label="3">周三</el-checkbox>
                <el-checkbox label="4">周四</el-checkbox>
                <el-checkbox label="5">周五</el-checkbox>
                <el-checkbox label="6">周六</el-checkbox>
                <el-checkbox label="7">周日</el-checkbox>
              </el-checkbox-group>
              <div class="form-tip">选择系统的工作日</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-card>
    <!-- 保存按钮 -->
    <div class="save-section">
      <el-button 
        type="primary" 
        size="large"
        @click="saveSettings"
        :loading="loading"
      >
        保存基本设置
      </el-button>
      <el-button 
        size="large"
        @click="resetSettings"
      >
        重置
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { settingsApi } from '@/services/api'

const emit = defineEmits(['save'])
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 注入全局设置
const allSettings = inject('settings')

// 系统设置
const systemSettings = reactive({
  weekStartDate: new Date().toISOString().split('T')[0],
  workDays: ['1', '2', '3', '4', '5']
})

// 保存设置
const saveSettings = () => {
  const generalData = {
    system_config: {
      weekStartDate: systemSettings.weekStartDate,
      workDays: systemSettings.workDays
    }
  }
  
  emit('save', 'general', generalData)
}

// 重置设置
const resetSettings = () => {
  // 重置为默认值
  Object.assign(systemSettings, {
    weekStartDate: new Date().toISOString().split('T')[0],
    workDays: ['1', '2', '3', '4', '5']
  })
}

// 初始化设置
const initSettings = () => {
  const generalSettings = allSettings.value.general
  
  if (generalSettings.system_config) {
    Object.assign(systemSettings, generalSettings.system_config)
  }
}

onMounted(() => {
  initSettings()
})

// 监听设置数据变化
watch(() => allSettings.value.general, (newSettings) => {
  if (newSettings && Object.keys(newSettings).length > 0) {
    initSettings()
  }
}, { deep: true })
</script>

<style lang="scss" scoped>
.general-settings {
  .settings-card {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    font-weight: 600;
    
    .el-icon {
      margin-right: 8px;
      color: #409eff;
    }
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
    line-height: 1.4;
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

:deep(.el-alert__content) {
  p {
    margin: 4px 0;
    line-height: 1.4;
  }
}
</style>