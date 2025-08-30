<template>
  <div class="ai-settings">
    <el-row :gutter="20">
      <!-- AI服务配置 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Cpu /></el-icon>
              <span>AI服务配置</span>
            </div>
          </template>

          <el-form :model="aiConfig" label-width="120px" ref="aiFormRef">
            <el-form-item label="启用AI排班">
              <el-switch v-model="aiConfig.enabled" />
              <span class="form-tip">使用AI自动生成排班方案</span>
            </el-form-item>

            <template v-if="aiConfig.enabled">
              <el-form-item label="AI提供商">
                <el-select v-model="aiConfig.provider" placeholder="选择AI提供商" style="width: 300px">
                  <el-option label="DeepSeek (推荐)" value="deepseek" />
                </el-select>
              </el-form-item>

              <!-- DeepSeek 配置 -->
              <template v-if="aiConfig.provider === 'deepseek'">
                <el-form-item label="API URL">
                  <el-input 
                    v-model="aiConfig.config.deepseek.apiUrl" 
                    placeholder="https://api.deepseek.com/v1/chat/completions"
                    style="width: 400px"
                  />
                  <div class="form-tip">DeepSeek API 接口地址，可自定义或使用默认地址</div>
                </el-form-item>
                
                <el-form-item label="API Key">
                  <el-input 
                    v-model="aiConfig.config.deepseek.apiKey" 
                    type="password"
                    show-password
                    placeholder="sk-..."
                    style="width: 400px"
                  />
                  <div class="form-tip">在DeepSeek平台获取API密钥</div>
                </el-form-item>
              </template>


              <el-form-item>
                <el-button 
                  type="success" 
                  @click="testAIConnection"
                  :loading="testing"
                >
                  测试AI连接
                </el-button>
                <span class="form-tip">点击测试AI服务连接是否正常</span>
              </el-form-item>
            </template>
          </el-form>
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
        保存AI设置
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

const emit = defineEmits(['save', 'test'])
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 注入全局设置
const allSettings = inject('settings')

// 测试状态
const testing = ref(false)

// AI配置
const aiConfig = reactive({
  enabled: false,
  provider: 'deepseek',
  config: {
    deepseek: {
      apiUrl: '',
      apiKey: ''
    },
  }
})

// 测试AI连接
const testAIConnection = async () => {
  const currentProvider = aiConfig.provider
  const currentConfig = aiConfig.config[currentProvider]

  if (!currentConfig.apiKey) {
    ElMessage.error('请先输入API Key')
    return
  }

  testing.value = true
  try {
    emit('test', currentProvider, currentConfig)
  } finally {
    testing.value = false
  }
}

// 保存设置
const saveSettings = () => {
  const aiData = {
    ai_config: {
      enabled: aiConfig.enabled,
      provider: aiConfig.provider,
      config: aiConfig.config
    }
  }
  
  emit('save', 'ai', aiData)
}

// 重置设置
const resetSettings = () => {
  Object.assign(aiConfig, {
    enabled: false,
    provider: 'deepseek',
    config: {
      deepseek: {
        apiUrl: '',
        apiKey: ''
      },
    }
  })
}

// 初始化设置
const initSettings = () => {
  const aiSettings = allSettings.value.ai
  
  if (aiSettings.ai_config) {
    Object.assign(aiConfig, aiSettings.ai_config)
  }
}

onMounted(() => {
  initSettings()
})

// 监听设置数据变化
watch(() => allSettings.value.ai, (newSettings) => {
  if (newSettings && Object.keys(newSettings).length > 0) {
    initSettings()
  }
}, { deep: true })
</script>

<style lang="scss" scoped>
.ai-settings {
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
</style>