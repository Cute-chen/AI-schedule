<template>
  <div class="data-management">
    <el-row :gutter="20">
      <!-- 设置导入导出 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Download /></el-icon>
              <span>设置导入导出</span>
            </div>
          </template>

          <div class="management-section">
            <el-form label-width="100px">
              <el-form-item label="导出设置">
                <el-button 
                  type="primary" 
                  @click="exportSettings"
                  :loading="exporting"
                >
                  <el-icon><Download /></el-icon>
                  导出所有设置
                </el-button>
                <div class="form-tip">导出当前所有系统设置为JSON文件</div>
              </el-form-item>

              <el-form-item label="导入设置">
                <el-upload
                  ref="uploadRef"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleFileChange"
                  accept=".json"
                >
                  <el-button type="success">
                    <el-icon><Upload /></el-icon>
                    选择设置文件
                  </el-button>
                </el-upload>
                <div class="form-tip">选择之前导出的设置文件进行导入</div>
              </el-form-item>

              <el-form-item v-if="importFile">
                <div class="import-preview">
                  <div class="file-info">
                    <el-icon><Document /></el-icon>
                    <span>{{ importFile.name }}</span>
                    <el-tag size="small" type="info">{{ formatFileSize(importFile.size) }}</el-tag>
                  </div>
                  <div class="import-actions">
                    <el-button 
                      type="primary" 
                      @click="importSettings"
                      :loading="importing"
                    >
                      导入设置
                    </el-button>
                    <el-button @click="importFile = null">取消</el-button>
                  </div>
                </div>
              </el-form-item>
            </el-form>

            <el-alert
              title="注意事项"
              type="warning"
              :closable="false"
              show-icon
              style="margin-top: 20px"
            >
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>导入设置会覆盖当前的系统设置</li>
                  <li>请确保导入的文件是从本系统导出的</li>
                  <li>建议在导入前备份当前设置</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settingsApi } from '@/services/api'

// 状态
const exporting = ref(false)
const importing = ref(false)
const importFile = ref(null)
const uploadRef = ref()

// 导出设置
const exportSettings = async () => {
  try {
    exporting.value = true
    
    const response = await settingsApi.exportSettings()
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: 'application/json'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `system_settings_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('设置导出成功')
  } catch (error) {
    console.error('导出设置失败:', error)
    ElMessage.error('导出设置失败')
  } finally {
    exporting.value = false
  }
}

// 处理文件选择
const handleFileChange = (file) => {
  if (file.raw.type !== 'application/json') {
    ElMessage.error('请选择JSON格式的文件')
    return
  }
  
  if (file.raw.size > 1024 * 1024) { // 1MB限制
    ElMessage.error('文件大小不能超过1MB')
    return
  }
  
  importFile.value = file.raw
}

// 导入设置
const importSettings = async () => {
  if (!importFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  try {
    const confirmResult = await ElMessageBox.confirm(
      '导入设置将覆盖当前配置，是否继续？',
      '确认导入',
      {
        type: 'warning'
      }
    )

    if (confirmResult !== 'confirm') return

    importing.value = true

    // 读取文件内容
    const fileContent = await readFileContent(importFile.value)
    const settingsData = JSON.parse(fileContent)

    // 调用导入API
    await settingsApi.importSettings(settingsData)
    
    ElMessage.success('设置导入成功，页面将在3秒后刷新')
    
    // 3秒后刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 3000)

  } catch (error) {
    console.error('导入设置失败:', error)
    if (error instanceof SyntaxError) {
      ElMessage.error('文件格式错误，请检查JSON格式')
    } else {
      ElMessage.error('导入设置失败')
    }
  } finally {
    importing.value = false
  }
}

// 读取文件内容
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
.data-management {
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

.management-section {
  .el-form-item {
    margin-bottom: 24px;
  }
  
  .form-tip {
    display: block;
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
    line-height: 1.4;
  }
}

.import-preview {
  padding: 16px;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  
  .file-info {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    
    .el-icon {
      margin-right: 8px;
      color: #409eff;
    }
    
    span {
      margin-right: 12px;
      color: #303133;
    }
  }
  
  .import-actions {
    display: flex;
    gap: 8px;
  }
}

:deep(.el-upload) {
  .el-button {
    .el-icon {
      margin-right: 4px;
    }
  }
}
</style>