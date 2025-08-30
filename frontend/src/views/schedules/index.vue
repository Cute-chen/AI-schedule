<template>
  <div class="schedules-container">
    <div class="page-header">
      <div>
        <h1>AI智能排班</h1>
        <p>调用AI-api自动生成排班方案</p>
      </div>
      <div class="header-actions">
        <el-button @click="showBatchPanel = true" type="success">
          <el-icon><Operation /></el-icon>
          批量排班
        </el-button>
        <el-button @click="exportSchedule" type="info">
          <el-icon><Download /></el-icon>
          导出排班表
        </el-button>
        <el-button @click="sendNotifications" type="warning" :disabled="!hasSchedules">
          <el-icon><Message /></el-icon>
          邮件通知
        </el-button>
        <el-button @click="showSyncDialog = true" type="success" :disabled="!currentWeekSchedules.length">
          <el-icon><CopyDocument /></el-icon>
          同步到其他周
        </el-button>
        <el-button @click="showBatchDeleteDialog = true" type="danger">
          <el-icon><Delete /></el-icon>
          批量删除排班
        </el-button>
        <el-button @click="showAIDialog = true" type="primary" size="large">
          <el-icon><Cpu /></el-icon>
          AI自动排班
        </el-button>
      </div>
    </div>

    <!-- 周选择器 -->
    <el-card class="week-selector">
      <div class="week-nav">
        <el-button @click="previousWeek" :icon="ArrowLeft">上一周</el-button>
        <div class="current-week">
          <h2>{{ formatWeekRange(currentWeek) }}</h2>
          <div class="week-stats">
            <el-tag type="primary">第{{ currentWeekNumber }}周</el-tag>
            <el-tag type="info">共{{ totalShifts }}个班次</el-tag>
            <el-tag :type="allAssigned ? 'success' : 'warning'">
              {{ allAssigned ? '全部已安排' : `还有${unassignedShifts}个空缺` }}
            </el-tag>
          </div>
        </div>
        <el-button @click="nextWeek" :icon="ArrowRight">下一周</el-button>
      </div>
    </el-card>

    <!-- 智能排班表格 -->
    <el-card class="schedule-calendar" v-loading="loading">
      <template #header>
        <div class="calendar-header-controls">
          <span>排班表</span>
          <div class="controls">
            <el-button @click="clearAllSchedules" type="danger" size="small" plain>
              清空本周排班
            </el-button>
          </div>
        </div>
      </template>

      <div class="calendar-grid">
        <!-- 表头 -->
        <div class="calendar-header">
          <div class="time-cell">时间段</div>
          <div 
            v-for="day in weekDays" 
            :key="day.date" 
            class="day-cell"
            :class="{ 'today': isToday(day.date) }"
          >
            <div class="day-name">{{ day.name }}</div>
            <div class="day-date">{{ formatDate(day.date) }}</div>
          </div>
        </div>

        <!-- 时间段行 -->
        <div 
          v-for="timeSlot in timeSlots" 
          :key="timeSlot.id"
          class="time-row"
        >
          <div class="time-cell">
            <div class="time-name">{{ timeSlot.name }}</div>
            <div class="time-period">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</div>
            <div class="required-people">需要{{ timeSlot.requiredPeople }}人</div>
          </div>
          
          <!-- 每天的排班状态 -->
          <div 
            v-for="day in weekDays"
            :key="`${timeSlot.id}-${day.date}`"
            class="schedule-cell"
            @drop="handleDrop($event, timeSlot.id, day.date)"
            @dragover.prevent
            @dragenter.prevent
          >
            <div class="schedule-content">
              <!-- 已排班的员工 -->
              <div 
                v-for="schedule in getSchedulesForSlot(timeSlot.id, day.date)"
                :key="schedule.id"
                class="scheduled-employee"
                :class="{ 
                  'ai-suggested': schedule.isAISuggestion,
                  'manually-assigned': !schedule.isAISuggestion,
                  'dragging': schedule.id === draggingScheduleId
                }"
                draggable="true"
                @dragstart="handleDragStart($event, schedule)"
                @dragend="handleDragEnd"
                @click="showScheduleDetails(schedule)"
              >
                <div class="employee-info">
                  <span class="employee-name">{{ schedule.employee?.name }}</span>
                  <div class="schedule-meta">
                    <el-icon v-if="schedule.isAISuggestion" class="ai-icon"><Cpu /></el-icon>
                    <span class="confidence" v-if="schedule.aiConfidence">
                      {{ Math.round(schedule.aiConfidence * 100) }}%
                    </span>
                  </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="schedule-actions">
                  <el-tooltip content="AI推荐理由" v-if="schedule.aiReason">
                    <el-button 
                      size="small" 
                      type="info" 
                      circle
                      @click.stop="showAIReason(schedule)"
                    >
                      <el-icon><QuestionFilled /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-button 
                    size="small" 
                    type="danger" 
                    circle
                    @click.stop="removeSchedule(schedule)"
                  >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
              </div>

              <!-- 空缺提示 -->
              <div 
                v-if="getNeedMorePeople(timeSlot.id, day.date) > 0"
                class="vacancy-slot"
                @click="showEmployeeSelector(timeSlot.id, day.date)"
              >
                <el-icon><Plus /></el-icon>
                <span>还需{{ getNeedMorePeople(timeSlot.id, day.date) }}人</span>
              </div>

              <!-- 超额警告 -->
              <div 
                v-if="getNeedMorePeople(timeSlot.id, day.date) < 0"
                class="overstaff-warning"
              >
                <el-icon><Warning /></el-icon>
                <span>超额{{ Math.abs(getNeedMorePeople(timeSlot.id, day.date)) }}人</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- AI排班对话框 -->
    <el-dialog v-model="showAIDialog" title="AI智能排班" width="600px">
      <div class="ai-dialog-content">
        <el-alert
          title="AI排班说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <ul>
              <li>AI会根据员工空闲时间、历史排班记录进行智能分析</li>
              <li>考虑员工偏好、工作量平衡、公平性等因素</li>
              <li>生成的排班方案可以手动调整</li>
            </ul>
          </template>
        </el-alert>

        <el-form :model="aiForm" label-width="120px">
          <el-form-item label="目标周次">
            <el-input-number
              v-model="aiForm.weekOffset"
              :min="-4"
              :max="8"
              placeholder="0"
              style="width: 200px"
              @change="updateWeekOffsetDisplay"
            />
            <span style="margin-left: 10px; color: #666;">
              (相对当前周的偏移，0=本周，1=下周，-1=上周)
            </span>
            <div class="week-display-info" style="margin-top: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px; font-size: 13px;">
              <div style="color: #303133; font-weight: 500;">{{ weekOffsetDescription }}</div>
              <div style="color: #666;">{{ aiFormWeekDisplay }}</div>
            </div>
          </el-form-item>
          
          <el-form-item label="排班策略">
            <el-radio-group v-model="aiForm.strategy">
              <el-radio-button label="fair">公平分配</el-radio-button>
              <el-radio-button label="priority">优先级分配</el-radio-button>
            </el-radio-group>
            <div class="strategy-desc">
              {{ getStrategyDescription(aiForm.strategy) }}
            </div>
          </el-form-item>

          
          <el-form-item label="特殊要求">
            <el-input 
              v-model="aiForm.requirements" 
              type="textarea" 
              :rows="3"
              placeholder="例如：周末需要经验丰富的员工，重要时段需要双人值班等整体要求"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12px; color: #999;">
            💡 提示：生成排班后可使用"同步到其他周"功能快速复制
          </div>
          <div>
            <el-button @click="showAIDialog = false">取消</el-button>
            <el-button type="primary" @click="generateAISchedule" :loading="aiGenerating">
              {{ aiGenerating ? '正在生成...' : '生成AI排班' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 员工选择对话框 -->
    <el-dialog v-model="showEmployeePicker" title="选择员工" width="500px">
      <div class="employee-picker">
        <div class="available-employees">
          <h3>可用员工 ({{ availableEmployees.length }}人)</h3>
          <div class="employee-list">
            <div 
              v-for="employee in availableEmployees"
              :key="employee.id"
              class="employee-option"
              @click="assignEmployee(employee)"
            >
              <el-avatar :size="40">{{ employee.name.charAt(0) }}</el-avatar>
              <div class="employee-details">
                <div class="name">{{ employee.name }}</div>
                <div class="priority">
                  优先级: {{ '★'.repeat(employee.priority || 1) }}
                </div>
              </div>
              <el-button type="primary" size="small">选择</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- AI推荐理由对话框 -->
    <el-dialog v-model="showReasonDialog" title="AI推荐理由" width="400px">
      <div v-if="selectedScheduleReason" class="reason-content">
        <el-icon><Cpu /></el-icon>
        <p>{{ selectedScheduleReason }}</p>
        <div class="confidence-score">
          <span>推荐置信度：</span>
          <el-progress 
            :percentage="Math.round(selectedScheduleConfidence * 100)"
            :color="getConfidenceColor(selectedScheduleConfidence)"
          />
        </div>
      </div>
    </el-dialog>



    <!-- 批量排班操作面板 -->
    <el-dialog v-model="showBatchPanel" title="批量排班操作" width="800px" :close-on-click-modal="false">
      <BatchOperationPanel
        :employees="employees"
        :time-slots="timeSlots"
        @operation-started="handleBatchOperationStarted"
        @operation-completed="handleBatchOperationCompleted"
      />
    </el-dialog>

    <!-- 同步到其他周对话框 -->
    <el-dialog v-model="showSyncDialog" title="同步排班到其他周" width="700px">
      <div class="sync-dialog-content">
        <el-alert
          title="同步说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <ul>
              <li>将当前周的排班模式完全复制到选择的目标周</li>
              <li>只复制排班安排，不复制员工的请假等个人信息</li>
              <li>如果目标周已有排班，可选择覆盖或跳过</li>
            </ul>
          </template>
        </el-alert>

        <!-- 当前周排班预览 -->
        <div class="source-week-preview" style="margin-bottom: 20px;">
          <h4>当前周排班预览 ({{ formatWeekRange(currentWeek) }})</h4>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
            <div v-if="currentWeekSchedules.length === 0" style="color: #999; text-align: center; padding: 20px;">
              当前周暂无排班数据
            </div>
            <div v-else>
              <div v-for="schedule in currentWeekSchedules" :key="schedule.id" 
                   style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
                <span>{{ schedule.employee?.name }}</span>
                <span>{{ formatDate(new Date(schedule.schedule_date)) }} {{ schedule.timeSlot?.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 目标周选择 -->
        <el-form :model="syncForm" label-width="100px">
          <el-form-item label="目标周次">
            <el-input
              v-model="syncForm.targetWeeksText"
              placeholder="例如：2（第2周）、3-6（第3-6周）、-1（前1周）"
              @input="parseTargetWeeksText"
              style="margin-bottom: 10px;"
            />
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">填写说明（周次序号，当前周为第1周）：</div>
              <div>• 正数表示未来周次：填写 "2" 表示同步到第2周（下周），"6" 表示第6周</div>
              <div>• 负数表示过去周次：填写 "-1" 表示同步到前1周，"-2" 表示前2周</div>
              <div>• 范围输入：填写 "2-6" 表示同步到第2周至第6周</div>
              <div>• 多个选择：填写 "-2,-1,2,6" 表示选择多个周次</div>
            </div>
            <div v-if="syncForm.targetAbsoluteWeeks && syncForm.targetAbsoluteWeeks.length > 0" style="margin-bottom: 10px;">
              <div style="font-size: 12px; color: #409eff; margin-bottom: 5px;">已选择周次：</div>
              <el-tag 
                v-for="week in parsedWeeksList" 
                :key="week.absoluteWeek"
                size="small"
                style="margin-right: 5px; margin-bottom: 5px;"
              >
                {{ week.description }} {{ week.relativeDescription }}
              </el-tag>
            </div>
            <div style="margin-top: 10px;">
              <el-button size="small" @click="setQuickWeeksAbsolute(2, 5)">快速填写：第2-5周</el-button>
              <el-button size="small" @click="setQuickWeeksAbsolute(2, 9)">快速填写：第2-9周</el-button>
              <el-button size="small" @click="clearSyncForm">清空</el-button>
            </div>
          </el-form-item>

          <el-form-item label="冲突处理">
            <el-radio-group v-model="syncForm.conflictMode">
              <el-radio-button label="skip">跳过已有排班</el-radio-button>
              <el-radio-button label="overwrite">覆盖已有排班</el-radio-button>
            </el-radio-group>
            <div class="strategy-desc" style="margin-top: 5px; font-size: 12px; color: #666;">
              {{ syncForm.conflictMode === 'skip' ? '遇到冲突时保留目标周的原有排班' : '遇到冲突时用当前周的排班覆盖目标周' }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12px; color: #666;">
            已选择 {{ syncForm.targetAbsoluteWeeks ? syncForm.targetAbsoluteWeeks.length : 0 }} 个目标周
          </div>
          <div>
            <el-button @click="showSyncDialog = false">取消</el-button>
            <el-button 
              type="primary" 
              @click="executeSyncSchedules" 
              :loading="syncExecuting"
              :disabled="!syncForm.targetAbsoluteWeeks || syncForm.targetAbsoluteWeeks.length === 0"
            >
              {{ syncExecuting ? '同步中...' : '开始同步' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 批量删除排班对话框 -->
    <el-dialog v-model="showBatchDeleteDialog" title="批量删除排班" width="700px">
      <div class="batch-delete-dialog-content">
        <el-alert
          title="批量删除说明"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <ul>
              <li><strong>此操作将删除指定周次范围内的所有排班记录</strong></li>
              <li>例如：删除第1-8周，将删除第1周到第8周的所有值班安排</li>
              <li>删除后的排班记录将无法恢复，请谨慎操作</li>
              <li>建议在删除前先确认周次范围是否正确</li>
            </ul>
          </template>
        </el-alert>

        <!-- 删除范围设置 -->
        <el-form :model="batchDeleteForm" label-width="120px">
          <el-form-item label="删除周次范围">
            <el-input
              v-model="batchDeleteForm.targetWeeksText"
              placeholder="例如：1-8（删除第1-8周）、2,4,6（删除第2、4、6周）、-2--1（删除前2周到前1周）"
              @input="parseBatchDeleteWeeksText"
              style="margin-bottom: 10px;"
            />
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">填写说明（周次序号，当前周为第1周）：</div>
              <div>• 正数表示未来周次：填写 "2-8" 表示删除第2周到第8周</div>
              <div>• 负数表示过去周次：填写 "-4--1" 表示删除前4周到前1周</div>
              <div>• 混合输入：填写 "-2,1,3-5" 表示删除前2周、第1周、第3-5周</div>
              <div>• 单个周次：填写 "6" 表示只删除第6周</div>
            </div>
            <div v-if="batchDeleteForm.targetAbsoluteWeeks && batchDeleteForm.targetAbsoluteWeeks.length > 0" style="margin-bottom: 10px;">
              <div style="font-size: 12px; color: #e6a23c; margin-bottom: 5px;">⚠️ 将要删除的周次：</div>
              <el-tag 
                v-for="week in parsedDeleteWeeksList" 
                :key="week.absoluteWeek"
                size="small"
                type="danger"
                style="margin-right: 5px; margin-bottom: 5px;"
              >
                {{ week.description }} {{ week.relativeDescription }}
              </el-tag>
            </div>
            <div style="margin-top: 10px;">
              <el-button size="small" @click="setQuickDeleteWeeks('1-8')">快速填写：第1-8周</el-button>
              <el-button size="small" @click="setQuickDeleteWeeks('2-9')">快速填写：第2-9周</el-button>
              <el-button size="small" @click="setQuickDeleteWeeks('-4--1')">快速填写：前4周</el-button>
              <el-button size="small" @click="clearBatchDeleteForm">清空</el-button>
            </div>
          </el-form-item>

          <el-form-item label="删除模式">
            <el-radio-group v-model="batchDeleteForm.deleteMode">
              <el-radio-button label="permanent">永久删除</el-radio-button>
            </el-radio-group>
            <div class="strategy-desc" style="margin-top: 5px; font-size: 12px; color: #666;">
              {{ batchDeleteForm.deleteMode === 'cancel' ? ' ' : '彻底删除排班记录，无法恢复' }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12px; color: #e6a23c;">
            ⚠️ 将删除 {{ batchDeleteForm.targetAbsoluteWeeks ? batchDeleteForm.targetAbsoluteWeeks.length : 0 }} 个周次的所有排班
          </div>
          <div>
            <el-button @click="showBatchDeleteDialog = false">取消</el-button>
            <el-button 
              type="danger" 
              @click="executeBatchDelete" 
              :loading="batchDeleteExecuting"
              :disabled="!batchDeleteForm.targetAbsoluteWeeks || batchDeleteForm.targetAbsoluteWeeks.length === 0"
            >
              {{ batchDeleteExecuting ? '删除中...' : '确认删除' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Collection, Operation, Download, Message, Cpu, ArrowLeft, ArrowRight, CopyDocument, Delete
} from '@element-plus/icons-vue'
import { scheduleApi, employeeApi, availabilityApi } from '@/services/api'
import request from '@/services/api'
import settingsService from '@/utils/settingsService'
import BatchOperationPanel from '@/components/BatchOperationPanel.vue'

// 工具函数 - 先定义函数
// 计算周次（参考首页实现）
const getWeekNumber = async (date) => {
  try {
    // 获取设置的周起始日期
    const weekStartDate = await settingsService.getWeekStartDate()
    
    // 计算从设定的周起始日期到目标日期的天数差
    const daysDiff = Math.floor((date - weekStartDate) / (24 * 60 * 60 * 1000))
    
    // 如果目标日期在设定的起始日期之前，返回第0周
    if (daysDiff < 0) {
      return 0
    }
    
    // 计算是第几周（从第1周开始）
    return Math.floor(daysDiff / 7) + 1
  } catch (error) {
    console.error('Failed to calculate week number:', error)
    // 回退到传统计算方法
    const start = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000))
    return Math.ceil(days / 7)
  }
}

// 响应式数据
const loading = ref(false)
const aiGenerating = ref(false)
const schedules = ref([])
const employees = ref([])
const timeSlots = ref([])
const currentWeek = ref(new Date())
const currentWeekStart = ref(new Date())
const currentWeekRange = ref('')
const showAIDialog = ref(false)
const showEmployeePicker = ref(false)
const showReasonDialog = ref(false)
const showSyncDialog = ref(false)
const syncExecuting = ref(false)
const showBatchDeleteDialog = ref(false)
const batchDeleteExecuting = ref(false)
const aiFormWeekDisplay = ref('')
const aiFormSelectedDate = ref(null)
const weekOffsetDescription = ref('')

// 监听AI对话框显示，设置正确的初始周次
watch(showAIDialog, async (show) => {
  if (show) {
    // 默认选择本周（偏移为0）
    aiForm.weekOffset = 0
    
    // 初始化周显示
    await updateWeekOffsetDisplay(0)
    
    console.log('AI对话框打开，初始化周次:', {
      currentWeek: currentWeek.value,
      currentWeekStart: currentWeekStart.value,
      weekOffset: aiForm.weekOffset,
      aiFormWeekStart: aiForm.weekStart,
      aiFormWeekDisplay: aiFormWeekDisplay.value,
      weekOffsetDescription: weekOffsetDescription.value
    })
  }
})
const draggingScheduleId = ref(null)
const selectedTimeSlot = ref(null)
const selectedDate = ref(null)
const selectedScheduleReason = ref('')
const selectedScheduleConfidence = ref(0)
const showBatchPanel = ref(false)

// AI排班表单
const aiForm = reactive({
  weekStart: new Date(),
  weekOffset: 0,
  strategy: 'fair',
  requirements: ''
})

// 同步排班表单
const syncForm = reactive({
  targetWeeks: [], // 存储偏移量（供后端使用）
  targetAbsoluteWeeks: [], // 存储绝对周次（供显示使用）
  targetWeeksText: '',
  conflictMode: 'skip'
})

// 批量删除表单
const batchDeleteForm = reactive({
  targetWeeks: [], // 存储偏移量（供后端使用）
  targetAbsoluteWeeks: [], // 存储绝对周次（供显示使用）
  targetWeeksText: '',
  deleteMode: 'cancel'
})

// 计算属性
const weekDays = computed(() => {
  const days = []
  const startOfWeek = currentWeekStart.value
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    days.push({
      date: date,
      name: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    })
  }
  return days
})

const totalShifts = computed(() => {
  return timeSlots.value.reduce((total, slot) => 
    total + (slot.requiredPeople * 7), 0
  )
})

const hasSchedules = computed(() => schedules.value.length > 0)

const unassignedShifts = computed(() => {
  let unassigned = 0
  timeSlots.value.forEach(slot => {
    weekDays.value.forEach(day => {
      const assigned = getSchedulesForSlot(slot.id, day.date).length
      const needed = slot.requiredPeople
      if (assigned < needed) {
        unassigned += (needed - assigned)
      }
    })
  })
  return unassigned
})

const allAssigned = computed(() => unassignedShifts.value === 0)

// 当前周次（响应式变量，需要异步计算）
const currentWeekNumber = ref(1)

// 计算当前周次的异步函数
const calculateCurrentWeekNumber = async () => {
  try {
    // 使用当前周的日期来计算周次
    const weekNumber = await getWeekNumber(currentWeek.value)
    currentWeekNumber.value = weekNumber
  } catch (error) {
    console.error('计算周次失败:', error)
    currentWeekNumber.value = 1 // 默认返回第1周
  }
}

const availableEmployees = computed(() => {
  // 这里应该根据选中的时间段和日期，返回可用的员工列表
  return employees.value.filter(emp => emp.status === 'active')
})

// 同步功能相关计算属性
const currentWeekSchedules = computed(() => {
  const weekStart = currentWeekStart.value
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  
  return schedules.value.filter(schedule => {
    const scheduleDate = new Date(schedule.schedule_date)
    return scheduleDate >= weekStart && scheduleDate <= weekEnd
  }).sort((a, b) => {
    // 按日期和时间段排序
    const dateCompare = new Date(a.schedule_date) - new Date(b.schedule_date)
    if (dateCompare !== 0) return dateCompare
    return (a.time_slot_id || 0) - (b.time_slot_id || 0)
  })
})

const availableWeeks = computed(() => {
  const weeks = []
  
  // 生成前后12周的选项（共24周）
  for (let offset = -12; offset <= 12; offset++) {
    if (offset === 0) continue // 跳过当前周
    
    const targetDate = new Date(currentWeek.value)
    targetDate.setDate(currentWeek.value.getDate() + (offset * 7))
    
    const weekStart = new Date(currentWeekStart.value)
    weekStart.setDate(currentWeekStart.value.getDate() + (offset * 7))
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    weeks.push({
      offset: offset,
      description: offset > 0 ? `第${offset}周后` : `第${Math.abs(offset)}周前`,
      dateRange: formatWeekRange(targetDate),
      weekStart: weekStart,
      weekEnd: weekEnd
    })
  }
  
  return weeks.sort((a, b) => a.offset - b.offset)
})

// 解析目标周次显示列表
const parsedWeeksList = computed(() => {
  if (!syncForm.targetAbsoluteWeeks || syncForm.targetAbsoluteWeeks.length === 0) {
    return []
  }
  
  return syncForm.targetAbsoluteWeeks.map(weekNumber => {
    let description, relativeDescription
    if (weekNumber > 1) {
      // 未来周次：第6周
      description = `第${weekNumber}周`
      relativeDescription = `（未来第${weekNumber}周，偏移+${weekNumber-1}）`
    } else if (weekNumber < 0) {
      // 过去周次：前2周
      description = `前${Math.abs(weekNumber)}周`
      relativeDescription = `（过去第${Math.abs(weekNumber)}周，偏移${weekNumber}）`
    } else {
      description = '当前周'
      relativeDescription = ''
    }
    
    return {
      absoluteWeek: weekNumber,
      description: description,
      relativeDescription: relativeDescription
    }
  }).sort((a, b) => a.absoluteWeek - b.absoluteWeek)
})

// 批量删除周次显示列表
const parsedDeleteWeeksList = computed(() => {
  if (!batchDeleteForm.targetAbsoluteWeeks || batchDeleteForm.targetAbsoluteWeeks.length === 0) {
    return []
  }
  
  return batchDeleteForm.targetAbsoluteWeeks.map(weekNumber => {
    let description, relativeDescription
    if (weekNumber > 1) {
      // 未来周次：第6周
      description = `第${weekNumber}周`
      relativeDescription = `（未来第${weekNumber}周，偏移+${weekNumber-1}）`
    } else if (weekNumber < 0) {
      // 过去周次：前2周
      description = `前${Math.abs(weekNumber)}周`
      relativeDescription = `（过去第${Math.abs(weekNumber)}周，偏移${weekNumber}）`
    } else {
      description = '当前周'
      relativeDescription = ''
    }
    
    return {
      absoluteWeek: weekNumber,
      description: description,
      relativeDescription: relativeDescription
    }
  }).sort((a, b) => a.absoluteWeek - b.absoluteWeek)
})

// 工具函数
const getStartOfWeek = async (date) => {
  try {
    return await settingsService.calculateWeekStart(date)
  } catch (error) {
    console.error('Failed to calculate week start, using default:', error)
    // 回退到默认逻辑
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }
}

// 更新周信息
const updateWeekInfo = async (date) => {
  try {
    const weekStart = await getStartOfWeek(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    currentWeekStart.value = weekStart
    currentWeekRange.value = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  } catch (error) {
    console.error('Failed to update week info:', error)
    currentWeekRange.value = '周期计算错误'
  }
}

const formatWeekRange = (date) => {
  return currentWeekRange.value
}

const formatDate = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const isToday = (date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// 获取指定时间段和日期的排班
const getSchedulesForSlot = (timeSlotId, date) => {
  const dateStr = date.toISOString().split('T')[0]
  return schedules.value.filter(
    s => s.time_slot_id === timeSlotId && s.schedule_date === dateStr
  )
}

// 获取需要补充的人数
const getNeedMorePeople = (timeSlotId, date) => {
  const slot = timeSlots.value.find(s => s.id === timeSlotId)
  const assigned = getSchedulesForSlot(timeSlotId, date).length
  return slot.requiredPeople - assigned
}

// 周导航
const previousWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeek.value = newDate
  await updateWeekInfo(newDate)
  await calculateCurrentWeekNumber()
  await loadSchedules()
}

const nextWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeek.value = newDate
  await updateWeekInfo(newDate)
  await calculateCurrentWeekNumber()
  await loadSchedules()
}

// 拖拽处理
const handleDragStart = (event, schedule) => {
  draggingScheduleId.value = schedule.id
  event.dataTransfer.setData('scheduleId', schedule.id)
}

const handleDragEnd = () => {
  draggingScheduleId.value = null
}

const handleDrop = async (event, timeSlotId, date) => {
  event.preventDefault()
  const scheduleId = event.dataTransfer.getData('scheduleId')
  
  if (scheduleId) {
    try {
      const dateStr = date.toISOString().split('T')[0]
      await scheduleApi.updateSchedule(scheduleId, {
        time_slot_id: timeSlotId,
        schedule_date: dateStr
      })
      
      // 更新本地数据
      const schedule = schedules.value.find(s => s.id == scheduleId)
      if (schedule) {
        schedule.time_slot_id = timeSlotId
        schedule.schedule_date = dateStr
        schedule.isAISuggestion = false // 手动调整后不再是AI建议
      }
      
      ElMessage.success('排班已调整')
    } catch (error) {
      console.error('调整排班失败:', error)
      ElMessage.error('调整失败')
    }
  }
}

// 显示员工选择器
const showEmployeeSelector = (timeSlotId, date) => {
  selectedTimeSlot.value = timeSlotId
  selectedDate.value = date
  showEmployeePicker.value = true
}

// 分配员工
const assignEmployee = async (employee) => {
  try {
    const dateStr = selectedDate.value.toISOString().split('T')[0]
    const weekStart = await getStartOfWeek(selectedDate.value)
    const weekStartDate = weekStart.toISOString().split('T')[0]
    
    const data = {
      employee_id: employee.id,
      time_slot_id: selectedTimeSlot.value,
      week_start_date: weekStartDate,
      schedule_date: dateStr,
      notes: '手动分配'
    }
    
    const response = await scheduleApi.createSchedule(data)
    schedules.value.push(response.data)
    showEmployeePicker.value = false
    ElMessage.success('员工已分配')
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  }
}

// 删除排班
const removeSchedule = async (schedule) => {
  try {
    await ElMessageBox.confirm('确定要删除这个排班吗？', '提示')
    await scheduleApi.deleteSchedule(schedule.id)
    
    const index = schedules.value.findIndex(s => s.id === schedule.id)
    if (index > -1) {
      schedules.value.splice(index, 1)
    }
    ElMessage.success('排班已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 显示AI推荐理由
const showAIReason = (schedule) => {
  selectedScheduleReason.value = schedule.aiReason || '暂无推荐理由'
  selectedScheduleConfidence.value = schedule.aiConfidence || 0
  showReasonDialog.value = true
}

// 获取置信度颜色
const getConfidenceColor = (confidence) => {
  if (confidence >= 0.8) return '#67c23a'
  if (confidence >= 0.6) return '#e6a23c'
  return '#f56c6c'
}

// 获取策略描述
const getStrategyDescription = (strategy) => {
  const descriptions = {
    fair: '尽量让每个员工的班次数量相等，考虑工作量平衡',
    priority: '根据员工空闲时间优先级和可用性进行排班'
  }
  return descriptions[strategy] || ''
}

// 更新周偏移显示
const updateWeekOffsetDisplay = async (offset = 0) => {
  console.log('updateWeekOffsetDisplay 被调用，偏移量:', offset)
  
  try {
    // 计算目标周的起始日期
    const baseWeekStart = new Date(currentWeekStart.value)
    const targetWeekStart = new Date(baseWeekStart)
    targetWeekStart.setDate(baseWeekStart.getDate() + (offset * 7))
    
    console.log('基准周起始:', baseWeekStart)
    console.log('目标周起始:', targetWeekStart)
    
    // 计算周结束日期
    const targetWeekEnd = new Date(targetWeekStart)
    targetWeekEnd.setDate(targetWeekStart.getDate() + 6)
    
    // 更新AI表单的周开始日期
    aiForm.weekStart = targetWeekStart
    
    // 更新显示文本
    aiFormWeekDisplay.value = `${formatDate(targetWeekStart)} - ${formatDate(targetWeekEnd)}`
    
    // 更新周次描述
    const descriptions = {
      '-4': '四周前', '-3': '三周前', '-2': '两周前', '-1': '上周',
      '0': '本周（当前）', 
      '1': '下周', '2': '两周后', '3': '三周后', '4': '四周后',
      '5': '五周后', '6': '六周后', '7': '七周后', '8': '八周后'
    }
    weekOffsetDescription.value = descriptions[offset.toString()] || `第${offset > 0 ? '+' : ''}${offset}周`
    
    console.log('更新显示:', {
      weekStart: targetWeekStart,
      weekEnd: targetWeekEnd,
      display: aiFormWeekDisplay.value,
      description: weekOffsetDescription.value
    })
    
  } catch (error) {
    console.error('更新周偏移显示失败:', error)
    aiFormWeekDisplay.value = '周期计算错误'
    weekOffsetDescription.value = '计算错误'
  }
}


// AI排班生成
const generateAISchedule = async () => {
  if (!aiForm.weekStart) {
    ElMessage.warning('请先选择要排班的周次')
    return
  }
  
  try {
    aiGenerating.value = true
    
    ElMessage.info('正在生成AI排班，请稍候...')
    
    const data = {
      weekStart: aiForm.weekStart.toISOString().split('T')[0],
      weekCount: 1, // 固定为1周
      strategy: aiForm.strategy,
      requirements: aiForm.requirements
    }
    
    const response = await scheduleApi.autoSchedule(data)
    
    console.log('前端收到AI排班响应:', response)
    
    if (response.success) {
      const aiSchedules = response.data || []
      
      console.log('AI排班数据:', {
        responseData: response.data,
        aiSchedulesLength: aiSchedules.length,
        firstSchedule: aiSchedules[0]
      })
      
      // 清除当前AI建议，添加新的AI排班
      schedules.value = schedules.value.filter(s => !s.isAISuggestion)
      
      // 将AI建议转换为前端格式并标记为AI建议
      const formattedSchedules = aiSchedules.map(s => ({
        id: `ai-${Date.now()}-${Math.random()}`, // 临时ID
        employee_id: s.employee_id,
        employee_name: s.employee_name,
        time_slot_id: s.time_slot_id,
        time_slot_name: s.time_slot_name,
        schedule_date: s.schedule_date,
        week_start_date: s.week_start_date,
        status: s.status,
        assigned_method: s.assigned_method,
        ai_confidence: s.ai_confidence || 0.8,
        ai_reason: s.ai_reason || s.notes,
        notes: s.notes,
        isAISuggestion: true,
        employee: { name: s.employee_name },
        timeSlot: { name: s.time_slot_name }
      }))
      
      schedules.value.push(...formattedSchedules)
      
      showAIDialog.value = false
      
      // 自动保存AI排班结果到数据库
      try {
        console.log('开始保存AI排班到数据库, 数据:', {
          schedules: aiSchedules,
          schedulesCount: aiSchedules.length,
          firstSchedule: aiSchedules[0]
        })
        
        const applyResponse = await scheduleApi.applyAISchedule({
          schedules: aiSchedules,
          overwriteExisting: false
        })
        
        console.log('保存AI排班响应:', applyResponse)
        
        if (applyResponse.success) {
          // 保存成功，重新加载排班数据
          await loadSchedules()
          
          const summary = response.summary
          if (summary) {
            ElMessage.success(
              `AI排班完成并已保存！为${weekOffsetDescription.value}生成了 ${summary.totalSchedules} 个排班` +
              (summary.failedWeeks > 0 ? `，其中 ${summary.failedWeeks} 周生成失败` : '') +
              `。稍后可使用"同步到其他周"功能快速复制到其他周期。`
            )
          } else {
            ElMessage.success(`AI排班已保存！为${weekOffsetDescription.value}生成${aiSchedules.length}个排班。稍后可同步到其他周期。`)
          }
        } else {
          ElMessage.warning('AI排班生成成功，但保存时发生错误：' + (applyResponse.message || '未知错误'))
        }
      } catch (saveError) {
        console.error('保存AI排班失败:', saveError)
        ElMessage.warning('AI排班生成成功，但保存失败，请手动刷新页面查看')
      }
      
      // 如果有错误，显示警告
      if (response.errors && response.errors.length > 0) {
        setTimeout(() => {
          ElMessage.warning(`部分周期排班生成失败，请检查员工空闲时间设置`)
        }, 1000)
      }
    } else {
      ElMessage.error(response.message || 'AI排班失败')
      aiProgressError.value = response.message || 'AI排班失败'
    }
  } catch (error) {
    console.error('AI排班失败:', error)
    let errorMsg
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMsg = 'AI排班请求超时，可能是因为排班数据复杂，请稍后重试或联系管理员'
    } else {
      errorMsg = error.response?.data?.message || error.message || 'AI排班失败，请检查设置'
    }
    ElMessage.error(errorMsg)
    aiProgressError.value = errorMsg
  } finally {
    aiGenerating.value = false
    
  }
}


// 清空排班
const clearAllSchedules = async () => {
  try {
    await ElMessageBox.confirm('确定要清空本周所有排班吗？', '警告', {
      type: 'warning'
    })
    
    // 删除本周的所有排班
    const weekStart = await getStartOfWeek(currentWeek.value)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const weekSchedules = schedules.value.filter(s => {
      const scheduleDate = new Date(s.schedule_date)
      return scheduleDate >= weekStart && scheduleDate <= weekEnd
    })
    
    for (const schedule of weekSchedules) {
      await scheduleApi.deleteSchedule(schedule.id)
    }
    
    schedules.value = schedules.value.filter(s => !weekSchedules.includes(s))
    ElMessage.success('已清空本周排班')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空失败:', error)
      ElMessage.error('清空失败')
    }
  }
}

// 应用所有AI建议
const applyAllAISuggestions = async () => {
  const aiSuggestions = schedules.value.filter(s => s.isAISuggestion)
  
  if (aiSuggestions.length === 0) {
    ElMessage.warning('没有AI建议可应用')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要应用${aiSuggestions.length}个AI建议到实际排班吗？`, '确认应用')
    
    const data = {
      schedules: aiSuggestions.map(s => ({
        employee_id: s.employee_id,
        time_slot_id: s.time_slot_id,
        schedule_date: s.schedule_date,
        week_start_date: s.week_start_date,
        ai_confidence: s.ai_confidence,
        ai_reason: s.ai_reason,
        notes: s.notes
      })),
      overwriteExisting: false
    }
    
    const response = await scheduleApi.applyAISchedule(data)
    
    if (response.success) {
      // 重新加载排班数据
      await fetchSchedules()
      ElMessage.success(`成功应用${response.data.success}个AI建议`)
      
      if (response.data.failed > 0) {
        setTimeout(() => {
          ElMessage.warning(`${response.data.failed}个建议应用失败，请检查冲突`)
        }, 1000)
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('应用AI建议失败:', error)
      ElMessage.error('应用AI建议失败')
    }
  }
}

// 清除AI建议
const clearAISuggestions = () => {
  const aiCount = schedules.value.filter(s => s.isAISuggestion).length
  if (aiCount === 0) {
    ElMessage.warning('没有AI建议可清除')
    return
  }
  
  schedules.value = schedules.value.filter(s => !s.isAISuggestion)
  ElMessage.success(`已清除${aiCount}个AI建议`)
}

// 发送通知
const sendNotifications = async () => {
  try {
    await ElMessageBox.confirm('（使用前请先检查设置通知开关）确定要向所有员工发送排班通知邮件吗？', '发送通知')
    
    const weekStart = currentWeekStart.value.toISOString().split('T')[0]
    await scheduleApi.sendNotifications({ weekStart })
    
    ElMessage.success('通知邮件已发送')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('发送通知失败:', error)
      ElMessage.error('发送通知失败')
    }
  }
}

// 导出排班表
const exportSchedule = async () => {
  try {
    // 计算当前周次
    const currentWeekNum = await getWeekNumber(currentWeek.value)
    
    // 显示周次选择对话框
    await ElMessageBox.prompt(
      `当前是第${currentWeekNum}周，请输入要导出的周次（例如：输入 ${currentWeekNum} 表示当前周，输入 ${currentWeekNum + 1} 表示下周）`,
      '导出排班表',
      {
        inputValue: currentWeekNum.toString(),
        inputPlaceholder: '周次数字',
        inputValidator: (value) => {
          if (!value) return '请输入周次'
          const weekNumber = parseInt(value)
          if (isNaN(weekNumber)) return '请输入有效的数字'
          if (weekNumber < 1 || weekNumber > 52) return '周次应在1-52之间'
          return true
        },
        inputErrorMessage: '请输入有效的周次'
      }
    ).then(async ({ value: selectedWeekNumber }) => {
      try {
        const weekNum = parseInt(selectedWeekNumber)
        
        // 根据周次计算对应的周起始日期
        const weekStartDate = await settingsService.getWeekStartDate()
        const targetWeekStart = new Date(weekStartDate)
        targetWeekStart.setDate(weekStartDate.getDate() + (weekNum - 1) * 7)
        
        const weekStartStr = targetWeekStart.toISOString().split('T')[0]
        
        try {
          // 构建下载URL
          const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
          const downloadUrl = `${baseURL}/ai-schedule/export/${weekStartStr}`
          
          console.log('导出URL:', downloadUrl)
          
          // 创建隐藏的下载链接
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `排班表_第${weekNum}周_${weekStartStr}.xlsx`
          link.style.display = 'none'
          
          // 添加到DOM，点击，然后移除
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          ElMessage.success(`第${weekNum}周排班表导出开始`)
        } catch (downloadError) {
          console.error('创建下载链接失败:', downloadError)
          ElMessage.error('下载失败，请重试')
        }
      } catch (calcError) {
        console.error('计算周次日期失败:', calcError)
        ElMessage.error('计算周次对应日期失败')
      }
    })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出排班表失败:', error)
      ElMessage.error('导出排班表失败')
    }
  }
}

// 同步排班功能
const selectCommonWeeks = (type) => {
  syncForm.targetWeeks = []
  
  switch (type) {
    case 'next4':
      syncForm.targetWeeks = [1, 2, 3, 4]
      break
    case 'prev4':
      syncForm.targetWeeks = [-4, -3, -2, -1]
      break
    case 'next8':
      syncForm.targetWeeks = [1, 2, 3, 4, 5, 6, 7, 8]
      break
    case 'prev8':
      syncForm.targetWeeks = [-8, -7, -6, -5, -4, -3, -2, -1]
      break
  }
}

// 解析目标周次文本输入 - 周次序号系统（当前周=1，输入6表示第6周，偏移=5）
const parseTargetWeeksText = () => {
  const input = syncForm.targetWeeksText.trim()
  if (!input) {
    syncForm.targetWeeks = []
    syncForm.targetAbsoluteWeeks = []
    return
  }
  
  try {
    const offsetWeeks = new Set() // 存储偏移量（供后端使用）
    const displayWeeks = new Set() // 存储显示用的周次描述
    
    // 按逗号分割
    const parts = input.split(',').map(part => part.trim()).filter(part => part)
    
    for (const part of parts) {
      if (part.includes('-')) {
        // 处理范围：如 "2-6", "-3--1"
        const dashIndex = part.lastIndexOf('-')
        let start, end
        
        if (part.startsWith('-')) {
          // 处理负数范围
          if (dashIndex === 0) {
            // 单个负数，如 "-2"（前2周）
            const weekNumber = parseInt(part)
            if (!isNaN(weekNumber) && weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) {
              // 负数直接作为偏移量（前2周 = -2偏移）
              const offset = weekNumber
              offsetWeeks.add(offset)
              displayWeeks.add(weekNumber) // 显示用：前2周
            }
            continue
          } else {
            // 负数范围，如 "-4--1"
            start = parseInt(part.substring(0, dashIndex))
            end = parseInt(part.substring(dashIndex + 1))
          }
        } else {
          // 正数范围，如 "2-6"（第2周到第6周）
          const rangeParts = part.split('-')
          start = parseInt(rangeParts[0])
          end = parseInt(rangeParts[1])
        }
        
        if (isNaN(start) || isNaN(end)) continue
        
        // 确保范围正确
        const minWeek = Math.min(start, end)
        const maxWeek = Math.max(start, end)
        
        for (let weekNumber = minWeek; weekNumber <= maxWeek; weekNumber++) {
          if (weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 1) { // 排除当前周（第1周）
            let offset
            if (weekNumber < 0) {
              // 负数周次：前2周(-2) = -2偏移
              offset = weekNumber
            } else {
              // 正数周次：第6周 = 5偏移（6-1=5）
              offset = weekNumber - 1
            }
            
            if (offset !== 0) { // 排除偏移为0的情况
              offsetWeeks.add(offset)
              displayWeeks.add(weekNumber) // 显示用原始周次
            }
          }
        }
      } else {
        // 处理单个数字
        const weekNumber = parseInt(part)
        if (!isNaN(weekNumber) && weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 1) {
          let offset
          if (weekNumber < 0) {
            // 负数周次：前2周(-2) = -2偏移
            offset = weekNumber
          } else {
            // 正数周次：第6周 = 5偏移（6-1=5）
            offset = weekNumber - 1
          }
          
          if (offset !== 0) { // 排除偏移为0的情况
            offsetWeeks.add(offset)
            displayWeeks.add(weekNumber) // 显示用原始周次
          }
        }
      }
    }
    
    // 存储偏移量供后端使用
    syncForm.targetWeeks = Array.from(offsetWeeks).sort((a, b) => a - b)
    
    // 存储显示用数组（原始周次）
    syncForm.targetAbsoluteWeeks = Array.from(displayWeeks).sort((a, b) => a - b)
    
  } catch (error) {
    console.error('解析目标周次失败:', error)
    syncForm.targetWeeks = []
    syncForm.targetAbsoluteWeeks = []
  }
}

// 快速设置周次
const setQuickWeeks = (text) => {
  syncForm.targetWeeksText = text
  parseTargetWeeksText()
}

// 快速设置相对周次范围（已弃用，保留向后兼容）
const setQuickWeeksRelative = (startOffset, endOffset) => {
  // 转换为绝对周次系统
  setQuickWeeksAbsolute(startOffset + 1, endOffset + 1)
}

// 快速设置绝对周次范围
const setQuickWeeksAbsolute = (startWeek, endWeek) => {
  const weekNumbers = []
  
  for (let i = startWeek; i <= endWeek; i++) {
    if (i >= -12 && i <= 12 && i !== 1) { // 排除当前周（第1周）
      weekNumbers.push(i)
    }
  }
  
  if (weekNumbers.length > 0) {
    const startWeek = weekNumbers[0]
    const endWeek = weekNumbers[weekNumbers.length - 1]
    syncForm.targetWeeksText = startWeek === endWeek ? `${startWeek}` : `${startWeek}-${endWeek}`
    parseTargetWeeksText()
  }
}

// 清空同步表单
const clearSyncForm = () => {
  syncForm.targetWeeks = []
  syncForm.targetAbsoluteWeeks = []
  syncForm.targetWeeksText = ''
}

const executeSyncSchedules = async () => {
  if (!syncForm.targetAbsoluteWeeks || syncForm.targetAbsoluteWeeks.length === 0) {
    ElMessage.warning('请选择要同步到的目标周')
    return
  }
  
  const currentSchedules = currentWeekSchedules.value
  if (currentSchedules.length === 0) {
    ElMessage.warning('当前周没有排班数据可同步')
    return
  }
  
  try {
    syncExecuting.value = true
    
    await ElMessageBox.confirm(
      `确定要将当前周的${currentSchedules.length}个排班同步到${syncForm.targetAbsoluteWeeks.length}个目标周吗？`,
      '确认同步'
    )
    
    const data = {
      sourceWeekStart: currentWeekStart.value.toISOString().split('T')[0],
      targetWeekOffsets: syncForm.targetWeeks,
      conflictMode: syncForm.conflictMode,
      schedules: currentSchedules.map(schedule => ({
        employee_id: schedule.employee_id,
        time_slot_id: schedule.time_slot_id,
        schedule_date: schedule.schedule_date,
        ai_confidence: schedule.ai_confidence || null,
        ai_reason: schedule.ai_reason || null,
        notes: schedule.notes || null
      }))
    }
    
    const response = await scheduleApi.syncSchedulesToWeeks(data)
    
    if (response.success) {
      ElMessage.success(`成功同步到${response.data.successCount}个周，失败${response.data.failedCount}个`)
      showSyncDialog.value = false
      
      // 清空表单
      syncForm.targetWeeks = []
      syncForm.targetAbsoluteWeeks = []
      syncForm.targetWeeksText = ''
      
      // 如果有失败的，显示详细信息
      if (response.data.failedCount > 0 && response.data.errors?.length > 0) {
        setTimeout(() => {
          const errorMessages = response.data.errors.slice(0, 3).map(err => err.message).join('；')
          ElMessage.warning(`部分同步失败：${errorMessages}${response.data.errors.length > 3 ? '...' : ''}`)
        }, 1000)
      }
    } else {
      ElMessage.error(response.message || '同步失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步排班失败:', error)
      ElMessage.error(error.response?.data?.message || '同步排班失败')
    }
  } finally {
    syncExecuting.value = false
  }
}

// 批量删除相关方法
// 解析批量删除目标周次文本输入
const parseBatchDeleteWeeksText = () => {
  const input = batchDeleteForm.targetWeeksText.trim()
  if (!input) {
    batchDeleteForm.targetWeeks = []
    batchDeleteForm.targetAbsoluteWeeks = []
    return
  }
  
  try {
    const offsetWeeks = new Set() // 存储偏移量（供后端使用）
    const displayWeeks = new Set() // 存储显示用的周次描述
    
    // 按逗号分割
    const parts = input.split(',').map(part => part.trim()).filter(part => part)
    
    for (const part of parts) {
      if (part.includes('-')) {
        // 处理范围：如 "2-6", "-3--1"
        const dashIndex = part.lastIndexOf('-')
        let start, end
        
        if (part.startsWith('-')) {
          // 处理负数范围
          if (dashIndex === 0) {
            // 单个负数，如 "-2"（前2周）
            const weekNumber = parseInt(part)
            if (!isNaN(weekNumber) && weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) {
              // 负数直接作为偏移量（前2周 = -2偏移）
              const offset = weekNumber
              offsetWeeks.add(offset)
              displayWeeks.add(weekNumber) // 显示用：前2周
            }
            continue
          } else {
            // 负数范围，如 "-4--1"
            start = parseInt(part.substring(0, dashIndex))
            end = parseInt(part.substring(dashIndex + 1))
          }
        } else {
          // 正数范围，如 "2-6"（第2周到第6周）
          const rangeParts = part.split('-')
          start = parseInt(rangeParts[0])
          end = parseInt(rangeParts[1])
        }
        
        if (isNaN(start) || isNaN(end)) continue
        
        // 确保范围正确
        const minWeek = Math.min(start, end)
        const maxWeek = Math.max(start, end)
        
        for (let weekNumber = minWeek; weekNumber <= maxWeek; weekNumber++) {
          if (weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) { // 允许删除当前周
            let offset
            if (weekNumber < 0) {
              // 负数周次：前2周(-2) = -2偏移
              offset = weekNumber
            } else {
              // 正数周次：第6周 = 5偏移（6-1=5），当前周（第1周）= 0偏移
              offset = weekNumber - 1
            }
            
            offsetWeeks.add(offset)
            displayWeeks.add(weekNumber) // 显示用原始周次
          }
        }
      } else {
        // 处理单个数字
        const weekNumber = parseInt(part)
        if (!isNaN(weekNumber) && weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) {
          let offset
          if (weekNumber < 0) {
            // 负数周次：前2周(-2) = -2偏移
            offset = weekNumber
          } else {
            // 正数周次：第6周 = 5偏移（6-1=5），当前周（第1周）= 0偏移
            offset = weekNumber - 1
          }
          
          offsetWeeks.add(offset)
          displayWeeks.add(weekNumber) // 显示用原始周次
        }
      }
    }
    
    // 存储偏移量供后端使用
    batchDeleteForm.targetWeeks = Array.from(offsetWeeks).sort((a, b) => a - b)
    
    // 存储显示用数组（原始周次）
    batchDeleteForm.targetAbsoluteWeeks = Array.from(displayWeeks).sort((a, b) => a - b)
    
  } catch (error) {
    console.error('解析批量删除目标周次失败:', error)
    batchDeleteForm.targetWeeks = []
    batchDeleteForm.targetAbsoluteWeeks = []
  }
}

// 快速设置删除周次
const setQuickDeleteWeeks = (text) => {
  batchDeleteForm.targetWeeksText = text
  parseBatchDeleteWeeksText()
}

// 清空批量删除表单
const clearBatchDeleteForm = () => {
  batchDeleteForm.targetWeeks = []
  batchDeleteForm.targetAbsoluteWeeks = []
  batchDeleteForm.targetWeeksText = ''
}

// 执行批量删除
const executeBatchDelete = async () => {
  if (!batchDeleteForm.targetAbsoluteWeeks || batchDeleteForm.targetAbsoluteWeeks.length === 0) {
    ElMessage.warning('请选择要删除的周次范围')
    return
  }
  
  try {
    batchDeleteExecuting.value = true
    
    const deleteTypeText = batchDeleteForm.deleteMode === 'permanent' ? '永久删除' : '软删除'
    const weekText = batchDeleteForm.targetAbsoluteWeeks.map(week => {
      if (week < 0) return `前${Math.abs(week)}周`
      if (week === 1) return '当前周'
      return `第${week}周`
    }).join('、')
    
    await ElMessageBox.confirm(
      `确定要${deleteTypeText}以下周次的所有排班记录吗？\n\n周次：${weekText}\n\n⚠️ 此操作${batchDeleteForm.deleteMode === 'permanent' ? '无法恢复' : '会将排班状态标记为已取消'}`,
      '确认删除',
      {
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    const data = {
      weekOffsets: batchDeleteForm.targetWeeks,
      deleteMode: batchDeleteForm.deleteMode
    }
    
    const response = await scheduleApi.batchDeleteSchedulesByWeeks(data)
    
    if (response.success) {
      ElMessage.success(`批量删除完成：${deleteTypeText}了${response.data.deletedCount}个排班记录`)
      showBatchDeleteDialog.value = false
      
      // 清空表单
      clearBatchDeleteForm()
      
      // 刷新当前页面的排班数据
      await fetchSchedules()
      
      // 如果有失败的，显示详细信息
      if (response.data.failedCount > 0 && response.data.errors?.length > 0) {
        setTimeout(() => {
          const errorMessages = response.data.errors.slice(0, 3).map(err => err.message).join('；')
          ElMessage.warning(`部分删除失败：${errorMessages}${response.data.errors.length > 3 ? '...' : ''}`)
        }, 1000)
      }
    } else {
      ElMessage.error(response.message || '批量删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除排班失败:', error)
      ElMessage.error(error.response?.data?.message || '批量删除排班失败')
    }
  } finally {
    batchDeleteExecuting.value = false
  }
}

// 数据获取函数
const fetchEmployees = async () => {
  try {
    const response = await employeeApi.getEmployees()
    employees.value = response.data || []
  } catch (error) {
    console.error('获取员工列表失败:', error)
  }
}

const fetchTimeSlots = async () => {
  try {
    const response = await availabilityApi.getTimeSlots()
    timeSlots.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('获取时间段失败:', error)
    timeSlots.value = []
  }
}

const fetchSchedules = async () => {
  try {
    loading.value = true
    
    const startDate = currentWeekStart.value.toISOString().split('T')[0]
    const endDate = new Date(currentWeekStart.value)
    endDate.setDate(endDate.getDate() + 6)
    
    const params = {
      dateRange: [startDate, endDate.toISOString().split('T')[0]]
    }
    
    const response = await scheduleApi.getSchedules(params)
    console.log('获取排班数据响应:', response)
    // 后端返回的数据结构是 { data: { data: [...], total, page, size } }
    const responseData = response.data
    schedules.value = Array.isArray(responseData.data) ? responseData.data : (Array.isArray(responseData) ? responseData : [])
    console.log('解析后的排班数据数量:', schedules.value.length)
  } catch (error) {
    console.error('获取排班数据失败:', error)
    schedules.value = []
  } finally {
    loading.value = false
  }
}

// 加载排班数据
const loadSchedules = async () => {
  await fetchSchedules()
}

// 监听周变化
watch(currentWeek, async (newWeek) => {
  await updateWeekInfo(newWeek)
  await calculateCurrentWeekNumber()
  fetchSchedules()
})

// 监听同步对话框显示，重置表单
watch(showSyncDialog, (show) => {
  if (show) {
    syncForm.targetWeeks = []
    syncForm.targetAbsoluteWeeks = []
    syncForm.targetWeeksText = ''
    syncForm.conflictMode = 'skip'
  }
})

// 监听批量删除对话框显示，重置表单
watch(showBatchDeleteDialog, (show) => {
  if (show) {
    batchDeleteForm.targetWeeks = []
    batchDeleteForm.targetAbsoluteWeeks = []
    batchDeleteForm.targetWeeksText = ''
    batchDeleteForm.deleteMode = 'cancel'
  }
})



const handleBatchOperationStarted = (operation) => {
  ElMessage.success('批量操作已启动')
}

const handleBatchOperationCompleted = (operation) => {
  ElMessage.success('批量操作已完成')
  fetchSchedules()
}

onMounted(async () => {
  await updateWeekInfo(currentWeek.value)
  
  // 计算初始周次
  await calculateCurrentWeekNumber()
  
  
  fetchEmployees()
  fetchTimeSlots()
  fetchSchedules()
})

</script>

<style lang="scss" scoped>
.schedules-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.week-selector {
  margin-bottom: 20px;
  
  .week-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    
    .current-week {
      text-align: center;
      
      h2 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .week-stats {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
    }
  }
}

.calendar-header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .controls {
    display: flex;
    gap: 8px;
  }
}

.schedule-calendar {
  .calendar-grid {
    display: grid;
    grid-template-rows: auto;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .calendar-header {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
    background: #f8f9fa;
    border-bottom: 2px solid #e4e7ed;
    
    .time-cell, .day-cell {
      padding: 12px;
      border-right: 1px solid #e4e7ed;
      font-weight: 600;
      text-align: center;
    }
    
    .day-cell {
      &.today {
        background: #e6f4ff;
        color: #1890ff;
      }
      
      .day-name {
        font-size: 14px;
      }
      
      .day-date {
        font-size: 12px;
        margin-top: 4px;
        opacity: 0.8;
      }
    }
  }
  
  .time-row {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
    min-height: 120px;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e4e7ed;
    }
    
    .time-cell {
      padding: 16px;
      border-right: 1px solid #e4e7ed;
      background: #fafafa;
      
      .time-name {
        font-weight: 600;
        color: #303133;
      }
      
      .time-period {
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
      }
      
      .required-people {
        font-size: 11px;
        color: #909399;
        margin-top: 4px;
      }
    }
    
    .schedule-cell {
      padding: 8px;
      border-right: 1px solid #e4e7ed;
      position: relative;
      
      .schedule-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .scheduled-employee {
        background: #e6f4ff;
        border: 1px solid #b3d8ff;
        border-radius: 4px;
        padding: 6px 8px;
        cursor: grab;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        &.ai-suggested {
          background: #f0f9ff;
          border-color: #40a9ff;
        }
        
        &.manually-assigned {
          background: #f6ffed;
          border-color: #95de64;
        }
        
        &.dragging {
          opacity: 0.5;
          transform: rotate(5deg);
        }
        
        &:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          
          .schedule-actions {
            opacity: 1;
          }
        }
        
        .employee-info {
          flex: 1;
          min-width: 0;
          
          .employee-name {
            font-weight: 600;
            font-size: 12px;
            color: #303133;
          }
          
          .schedule-meta {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 2px;
            
            .ai-icon {
              color: #1890ff;
              font-size: 10px;
            }
            
            .confidence {
              font-size: 10px;
              color: #666;
            }
          }
        }
        
        .schedule-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }
      }
      
      .vacancy-slot {
        background: #fafafa;
        border: 1px dashed #d9d9d9;
        border-radius: 4px;
        padding: 8px;
        text-align: center;
        cursor: pointer;
        color: #909399;
        font-size: 11px;
        transition: all 0.2s;
        
        &:hover {
          background: #f0f9ff;
          border-color: #40a9ff;
          color: #40a9ff;
        }
      }
      
      .overstaff-warning {
        background: #fff2e8;
        border: 1px solid #ffbb96;
        border-radius: 4px;
        padding: 4px 6px;
        text-align: center;
        color: #d4380d;
        font-size: 10px;
      }
    }
  }
}

.ai-dialog-content {
  .strategy-desc {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
}

.employee-picker {
  .available-employees {
    h3 {
      margin: 0 0 16px 0;
      color: #303133;
    }
    
    .employee-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .employee-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #f0f9ff;
        border-color: #40a9ff;
      }
      
      .employee-details {
        flex: 1;
        
        .name {
          font-weight: 600;
          color: #303133;
        }
        
        .priority {
          font-size: 12px;
          color: #faad14;
          margin-top: 2px;
        }
      }
    }
  }
}

.reason-content {
  text-align: center;
  
  .el-icon {
    font-size: 32px;
    color: #1890ff;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0 0 16px 0;
    color: #303133;
    line-height: 1.6;
  }
  
  .confidence-score {
    span {
      font-size: 14px;
      color: #666;
      margin-right: 8px;
    }
  }
}


// 响应式设计
@media (max-width: 1200px) {
  .calendar-grid {
    overflow-x: auto;
  }
  
  .calendar-header,
  .time-row {
    min-width: 800px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: stretch;
    
    .el-button {
      flex: 1;
    }
  }
}
</style>