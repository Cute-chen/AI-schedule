<template>
  <div class="batch-operation-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <span>批量操作</span>
          <el-button size="small" @click="showHistory = !showHistory">
            <el-icon><Clock /></el-icon>
            操作历史
          </el-button>
        </div>
      </template>

      <!-- 批量操作选项 -->
      <div class="operation-tabs">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="批量排班" name="schedule">
            <div class="batch-schedule">
              <el-form :model="scheduleForm" label-width="100px">
                <el-form-item label="目标周期">
                  <WeekRangeSelector 
                    v-model="scheduleForm.weeks"
                    title="选择要排班的周期"
                  />
                </el-form-item>
                
                <el-form-item label="排班模式">
                  <el-radio-group v-model="scheduleForm.mode">
                    <el-radio label="template">使用模板</el-radio>
                    <el-radio label="copy">复制现有排班</el-radio>
                    <el-radio label="ai">AI智能排班</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <!-- 模板模式 -->
                <div v-if="scheduleForm.mode === 'template'">
                  <el-form-item label="选择模板">
                    <el-select v-model="scheduleForm.templateId" placeholder="选择排班模板">
                      <el-option
                        v-for="template in scheduleTemplates"
                        :key="template.id"
                        :label="template.name"
                        :value="template.id"
                      />
                    </el-select>
                  </el-form-item>
                </div>
                
                <!-- 复制模式 -->
                <div v-if="scheduleForm.mode === 'copy'">
                  <el-form-item label="源周次">
                    <el-input-number 
                      v-model="scheduleForm.sourceWeek" 
                      :min="1" 
                      :max="52"
                      placeholder="要复制的周次"
                    />
                  </el-form-item>
                </div>
                
                <!-- AI模式 -->
                <div v-if="scheduleForm.mode === 'ai'">
                  <el-form-item label="排班策略">
                    <el-select v-model="scheduleForm.strategy">
                      <el-option label="公平分配" value="fair" />
                      <el-option label="优先级优先" value="priority" />
                      <el-option label="经验优化" value="experience" />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="特殊要求">
                    <el-input 
                      v-model="scheduleForm.requirements" 
                      type="textarea" 
                      :rows="3"
                      placeholder="可选：描述特殊排班要求"
                    />
                  </el-form-item>
                </div>
                
                <el-form-item label="覆盖设置">
                  <el-checkbox v-model="scheduleForm.overwriteExisting">
                    覆盖已存在的排班
                  </el-checkbox>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="startBatchSchedule" :loading="processing">
                    开始批量排班
                  </el-button>
                  <el-button @click="resetScheduleForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <el-tab-pane label="批量调班" name="adjust">
            <div class="batch-adjust">
              <el-form :model="adjustForm" label-width="100px">
                <el-form-item label="目标周期">
                  <WeekRangeSelector 
                    v-model="adjustForm.weeks"
                    title="选择要调班的周期"
                  />
                </el-form-item>
                
                <el-form-item label="调班类型">
                  <el-radio-group v-model="adjustForm.type">
                    <el-radio label="single">单次调班</el-radio>
                    <el-radio label="swap">员工互换</el-radio>
                    <el-radio label="replace">批量替换</el-radio>
                    <el-radio label="pattern">模式调整</el-radio>
                  </el-radio-group>
                  <div class="type-description">
                    {{ getAdjustTypeDescription(adjustForm.type) }}
                  </div>
                </el-form-item>
                
                <!-- 调班规则配置 -->
                <el-form-item label="调班规则">
                  <div class="adjustment-rules">
                    <div 
                      v-for="(rule, index) in adjustForm.adjustments"
                      :key="index"
                      class="rule-item"
                    >
                      <div class="rule-header">
                        <span class="rule-index">规则 {{ index + 1 }}</span>
                        <el-button 
                          size="small" 
                          type="danger" 
                          text
                          @click="removeAdjustmentRule(index)"
                          :disabled="adjustForm.adjustments.length <= 1"
                        >
                          删除
                        </el-button>
                      </div>
                      
                      <div class="rule-content">
                        <div class="from-section">
                          <label>调出:</label>
                          <el-select v-model="rule.fromEmployee" placeholder="选择员工" clearable>
                            <el-option
                              v-for="emp in employees"
                              :key="emp.id"
                              :label="emp.name"
                              :value="emp.id"
                            />
                          </el-select>
                          <span class="connector">在</span>
                          <el-select v-model="rule.fromTimeSlot" placeholder="选择时间段" clearable>
                            <el-option
                              v-for="slot in timeSlots"
                              :key="slot.id"
                              :label="slot.name"
                              :value="slot.id"
                            />
                          </el-select>
                        </div>
                        
                        <div class="arrow-section">
                          <el-icon class="arrow-icon"><Right /></el-icon>
                        </div>
                        
                        <div class="to-section">
                          <label>调入:</label>
                          <el-select v-model="rule.toEmployee" placeholder="选择员工" clearable>
                            <el-option
                              v-for="emp in employees"
                              :key="emp.id"
                              :label="emp.name"
                              :value="emp.id"
                            />
                          </el-select>
                          <span class="connector">在</span>
                          <el-select v-model="rule.toTimeSlot" placeholder="选择时间段" clearable>
                            <el-option
                              v-for="slot in timeSlots"
                              :key="slot.id"
                              :label="slot.name"
                              :value="slot.id"
                            />
                          </el-select>
                        </div>
                      </div>
                      
                      <!-- 规则验证提示 -->
                      <div v-if="!isRuleValid(rule)" class="rule-warning">
                        <el-icon><Warning /></el-icon>
                        <span>{{ getRuleWarning(rule) }}</span>
                      </div>
                    </div>
                    
                    <el-button size="small" type="primary" @click="addAdjustmentRule">
                      <el-icon><Plus /></el-icon>
                      添加调班规则
                    </el-button>
                  </div>
                </el-form-item>
                
                <!-- 调班验证选项 -->
                <el-form-item label="验证选项">
                  <el-checkbox-group v-model="adjustForm.validationOptions">
                    <el-checkbox label="checkConflicts">检查时间冲突</el-checkbox>
                    <el-checkbox label="checkAvailability">检查员工空闲时间</el-checkbox>
                    <el-checkbox label="allowOverride">允许强制调班</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="startBatchAdjust" :loading="processing">
                    开始批量调班
                  </el-button>
                  <el-button @click="resetAdjustForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

        </el-tabs>
      </div>

      <!-- 操作进度 -->
      <div v-if="currentOperation" class="operation-progress">
        <el-divider />
        <div class="progress-header">
          <h4>{{ currentOperation.operation_name }}</h4>
          <el-tag :type="getStatusType(currentOperation.status)">
            {{ getStatusText(currentOperation.status) }}
          </el-tag>
        </div>
        
        <el-progress 
          :percentage="currentOperation.progress"
          :status="currentOperation.status === 'failed' ? 'exception' : undefined"
        />
        
        <div class="progress-details">
          <p>目标周期: {{ currentOperation.target_weeks.join(', ') }}</p>
          <p v-if="currentOperation.result_summary">
            结果: {{ formatResultSummary(currentOperation.result_summary) }}
          </p>
          <p v-if="currentOperation.error_message" class="error-message">
            错误: {{ currentOperation.error_message }}
          </p>
        </div>
      </div>

      <!-- 操作历史 -->
      <el-drawer v-model="showHistory" title="批量操作历史" size="60%">
        <div class="history-list">
          <el-table :data="operationHistory" v-loading="historyLoading">
            <el-table-column prop="operation_name" label="操作名称" />
            <el-table-column prop="target_weeks" label="目标周期" width="200">
              <template #default="{ row }">
                {{ row.target_weeks.join(', ') }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="progress" label="进度" width="120">
              <template #default="{ row }">
                <el-progress :percentage="row.progress" :show-text="false" />
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" @click="viewOperationDetails(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-drawer>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Plus, Right, Warning } from '@element-plus/icons-vue'
import WeekRangeSelector from './WeekRangeSelector.vue'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  timeSlots: {
    type: Array,
    default: () => []
  },
  scheduleTemplates: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['operationStarted', 'operationCompleted'])

// 响应式数据
const activeTab = ref('schedule')
const processing = ref(false)
const showHistory = ref(false)
const historyLoading = ref(false)
const currentOperation = ref(null)
const operationHistory = ref([])
let pollingTimer = null

// 批量排班表单
const scheduleForm = reactive({
  weeks: [],
  mode: 'template',
  templateId: '',
  sourceWeek: null,
  strategy: 'fair',
  requirements: '',
  overwriteExisting: false
})

// 批量调班表单
const adjustForm = reactive({
  weeks: [],
  type: 'single',
  validationOptions: ['checkConflicts', 'checkAvailability'],
  adjustments: [
    {
      fromEmployee: '',
      fromTimeSlot: '',
      toEmployee: '',
      toTimeSlot: ''
    }
  ]
})


// 方法
const handleTabClick = (tab) => {
  // 切换标签时的处理
}

const startBatchSchedule = async () => {
  if (scheduleForm.weeks.length === 0) {
    ElMessage.warning('请选择目标周期')
    return
  }
  
  if (scheduleForm.mode === 'template' && !scheduleForm.templateId) {
    ElMessage.warning('请选择模板')
    return
  }
  
  if (scheduleForm.mode === 'copy' && !scheduleForm.sourceWeek) {
    ElMessage.warning('请输入源周次')
    return
  }
  
  try {
    processing.value = true
    
    let apiEndpoint = ''
    let data = {}
    
    if (scheduleForm.mode === 'template') {
      apiEndpoint = '/api/schedules/batch-advanced'
      data = {
        weeks: scheduleForm.weeks,
        templateId: scheduleForm.templateId,
        overwriteExisting: scheduleForm.overwriteExisting
      }
    } else if (scheduleForm.mode === 'copy') {
      apiEndpoint = '/api/schedules/copy'
      data = {
        sourceWeek: scheduleForm.sourceWeek,
        targetWeeks: scheduleForm.weeks,
        overwrite: scheduleForm.overwriteExisting
      }
    } else if (scheduleForm.mode === 'ai') {
      apiEndpoint = '/api/schedules/auto-schedule'
      data = {
        weeks: scheduleForm.weeks,
        strategy: scheduleForm.strategy,
        requirements: scheduleForm.requirements
      }
    }
    
    // const response = await api.post(apiEndpoint, data)
    // currentOperation.value = response.data
    // startPolling(response.data.batchOperationId)
    
    // 模拟响应
    currentOperation.value = {
      operation_name: '批量排班',
      target_weeks: scheduleForm.weeks,
      status: 'processing',
      progress: 0
    }
    simulateProgress()
    
    ElMessage.success('批量排班已启动')
    emit('operationStarted', currentOperation.value)
  } catch (error) {
    ElMessage.error('启动批量排班失败')
  } finally {
    processing.value = false
  }
}

const startBatchAdjust = async () => {
  if (adjustForm.weeks.length === 0) {
    ElMessage.warning('请选择目标周期')
    return
  }
  
  // 验证调班规则
  const validAdjustments = adjustForm.adjustments.filter(adj => isRuleValid(adj))
  
  if (validAdjustments.length === 0) {
    ElMessage.warning('请配置至少一条有效的调班规则')
    return
  }
  
  // 检查规则冲突
  const hasInvalidRules = adjustForm.adjustments.some(rule => !isRuleValid(rule) && (rule.fromEmployee || rule.fromTimeSlot || rule.toEmployee || rule.toTimeSlot))
  if (hasInvalidRules) {
    ElMessage.warning('存在无效的调班规则，请检查后重试')
    return
  }
  
  // 确认操作
  try {
    await ElMessageBox.confirm(
      `确定要对 ${adjustForm.weeks.length} 个周期执行 ${validAdjustments.length} 条调班规则吗？\n\n调班类型：${getAdjustTypeDescription(adjustForm.type)}`,
      '确认批量调班',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  
  try {
    processing.value = true
    
    const data = {
      weeks: adjustForm.weeks,
      type: adjustForm.type,
      validationOptions: adjustForm.validationOptions,
      adjustments: validAdjustments.map(adj => ({
        fromEmployee: adj.fromEmployee,
        fromTimeSlot: adj.fromTimeSlot,
        toEmployee: adj.toEmployee,
        toTimeSlot: adj.toTimeSlot
      }))
    }
    
    // const response = await api.post('/api/schedules/batch-adjust', data)
    // currentOperation.value = response.data
    // startPolling(response.data.batchOperationId)
    
    // 模拟响应
    currentOperation.value = {
      operation_name: `批量调班 (${adjustForm.type})`,
      target_weeks: adjustForm.weeks,
      status: 'processing',
      progress: 0
    }
    simulateProgress()
    
    ElMessage.success(`批量调班已启动，将处理 ${validAdjustments.length} 条规则`)
    emit('operationStarted', currentOperation.value)
  } catch (error) {
    console.error('批量调班失败:', error)
    ElMessage.error(error.response?.data?.message || '启动批量调班失败')
  } finally {
    processing.value = false
  }
}


const addAdjustmentRule = () => {
  adjustForm.adjustments.push({
    fromEmployee: '',
    fromTimeSlot: '',
    toEmployee: '',
    toTimeSlot: ''
  })
}

const removeAdjustmentRule = (index) => {
  adjustForm.adjustments.splice(index, 1)
}

const resetScheduleForm = () => {
  Object.assign(scheduleForm, {
    weeks: [],
    mode: 'template',
    templateId: '',
    sourceWeek: null,
    strategy: 'fair',
    requirements: '',
    overwriteExisting: false
  })
}

const resetAdjustForm = () => {
  Object.assign(adjustForm, {
    weeks: [],
    type: 'single',
    validationOptions: ['checkConflicts', 'checkAvailability'],
    adjustments: [
      {
        fromEmployee: '',
        fromTimeSlot: '',
        toEmployee: '',
        toTimeSlot: ''
      }
    ]
  })
}

// 新增辅助方法
const getAdjustTypeDescription = (type) => {
  const descriptions = {
    single: '单次调班：将指定员工从一个时间段调整到另一个时间段',
    swap: '员工互换：两个员工之间交换时间段',
    replace: '批量替换：将某个员工在指定时间段的所有班次替换为另一个员工',
    pattern: '模式调整：根据预设模式批量调整多个员工的班次'
  }
  return descriptions[type] || ''
}

const isRuleValid = (rule) => {
  // 基本验证：至少要有源员工或源时间段
  return rule.fromEmployee || rule.fromTimeSlot
}

const getRuleWarning = (rule) => {
  if (!rule.fromEmployee && !rule.fromTimeSlot) {
    return '请至少选择源员工或源时间段'
  }
  if (rule.fromEmployee === rule.toEmployee && rule.fromTimeSlot === rule.toTimeSlot) {
    return '源和目标不能相同'
  }
  if (adjustForm.type === 'swap' && (!rule.toEmployee || !rule.toTimeSlot)) {
    return '互换模式需要指定完整的目标员工和时间段'
  }
  return ''
}


const startPolling = (operationId) => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
  
  pollingTimer = setInterval(async () => {
    try {
      // const response = await api.get(`/api/availability/batch/${operationId}`)
      // currentOperation.value = response.data
      
      // if (response.data.status === 'completed' || response.data.status === 'failed') {
      //   clearInterval(pollingTimer)
      //   emit('operationCompleted', response.data)
      // }
    } catch (error) {
      clearInterval(pollingTimer)
    }
  }, 2000)
}

// 模拟进度更新
const simulateProgress = () => {
  let progress = 0
  const timer = setInterval(() => {
    progress += Math.random() * 20
    if (progress >= 100) {
      progress = 100
      currentOperation.value.status = 'completed'
      currentOperation.value.progress = 100
      currentOperation.value.result_summary = {
        total: 56,
        created: 52,
        skipped: 4
      }
      clearInterval(timer)
      emit('operationCompleted', currentOperation.value)
    } else {
      currentOperation.value.progress = Math.round(progress)
    }
  }, 500)
}

const fetchOperationHistory = async () => {
  try {
    historyLoading.value = true
    // const response = await api.get('/api/batch-operations')
    // operationHistory.value = response.data.data || []
    operationHistory.value = []
  } catch (error) {
    ElMessage.error('获取操作历史失败')
  } finally {
    historyLoading.value = false
  }
}

const viewOperationDetails = (operation) => {
  ElMessageBox.alert(
    JSON.stringify(operation, null, 2),
    '操作详情',
    { customClass: 'operation-details-dialog' }
  )
}

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '已失败'
  }
  return texts[status] || status
}

const formatResultSummary = (summary) => {
  if (!summary) return ''
  return `总计: ${summary.total}, 成功: ${summary.created || summary.success}, 跳过: ${summary.skipped || summary.failed}`
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchOperationHistory()
})

onUnmounted(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
})
</script>

<style lang="scss" scoped>
.batch-operation-panel {
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .operation-progress {
    margin-top: 20px;
    
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      h4 {
        margin: 0;
      }
    }
    
    .progress-details {
      margin-top: 12px;
      font-size: 14px;
      
      p {
        margin: 4px 0;
      }
      
      .error-message {
        color: #f56c6c;
      }
    }
  }
  
  .adjustment-rules {
    .rule-item {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      background: #fafafa;
      
      .rule-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .rule-index {
          font-weight: 600;
          color: #409eff;
        }
      }
      
      .rule-content {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 16px;
        align-items: center;
        
        .from-section, .to-section {
          display: flex;
          align-items: center;
          gap: 8px;
          
          label {
            font-weight: 500;
            min-width: 40px;
          }
          
          .connector {
            color: #909399;
            font-size: 12px;
          }
        }
        
        .arrow-section {
          text-align: center;
          
          .arrow-icon {
            font-size: 20px;
            color: #409eff;
          }
        }
      }
      
      .rule-warning {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        padding: 6px 8px;
        background: #fef0f0;
        border: 1px solid #fde2e2;
        border-radius: 4px;
        color: #f56c6c;
        font-size: 12px;
      }
    }
  }
  
  .type-description {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f0f9ff;
    border: 1px solid #b3d8ff;
    border-radius: 4px;
    font-size: 12px;
    color: #409eff;
    line-height: 1.4;
  }
  
  .history-list {
    .el-table {
      border-radius: 8px;
      overflow: hidden;
    }
  }
}

:deep(.operation-details-dialog) {
  .el-message-box__message {
    font-family: monospace;
    white-space: pre-wrap;
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>