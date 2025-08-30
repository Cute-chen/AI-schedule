<template>
  <div class="availability-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1>空闲时间管理</h1>
          <p>管理您的空闲时间安排，系统会根据这些信息进行排班分配</p>
        </div>
        <div class="header-actions">
          <el-button @click="$router.go(-1)" size="default">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 操作选项卡 -->
    <el-card class="operations-card" shadow="hover">
      <el-tabs v-model="activeTab" type="card" class="operation-tabs">
        <!-- 批量添加空闲时间 -->
        <el-tab-pane label="批量添加空闲时间" name="add">
          <div class="operation-content">
            <div class="operation-form">
              <el-form :model="batchForm" label-width="120px" size="default">
                <!-- 周选择 -->
                <div class="form-section">
                  <div class="section-title">
                    <el-icon><Calendar /></el-icon>
                    选择周范围
                  </div>
                  <div class="section-content">
                    <WeekRangeSelector
                      :year="new Date().getFullYear()"
                      @change="onWeekSelectionChange"
                      :max-height="350"
                    />
                    <div class="week-info" v-if="selectedWeeks.length > 0">
                      <el-tag type="info" size="small">
                        已选择 {{ selectedWeeks.length }} 个周: {{ getSelectedWeeksText() }}
                      </el-tag>
                    </div>
                  </div>
                </div>

                <!-- 星期和时间段选择 -->
                <div class="form-section">
                  <div class="section-title">
                    <el-icon><Clock /></el-icon>
                    设置空闲时间
                  </div>
                  <div class="section-content">
                    <div class="weekday-grid">
                      <div 
                        v-for="(dayName, dayIndex) in weekDayNames" 
                        :key="dayIndex"
                        class="weekday-card"
                        :class="{ 'active': batchForm.weekdaySelections[dayIndex].enabled }"
                      >
                        <div class="weekday-header">
                          <el-checkbox 
                            v-model="batchForm.weekdaySelections[dayIndex].enabled"
                            @change="toggleWeekday(dayIndex)"
                            size="large"
                          >
                            <span class="weekday-name">{{ dayName }}</span>
                          </el-checkbox>
                        </div>
                        <div 
                          v-if="batchForm.weekdaySelections[dayIndex].enabled" 
                          class="time-slot-list"
                        >
                          <el-checkbox-group 
                            v-model="batchForm.weekdaySelections[dayIndex].timeSlotIds"
                            size="small"
                          >
                            <div 
                              v-for="timeSlot in timeSlots" 
                              :key="timeSlot.id"
                              class="time-slot-item"
                            >
                              <el-checkbox :label="timeSlot.id">
                                <div class="time-slot-info">
                                  <div class="slot-name">{{ timeSlot.name }}</div>
                                  <div class="slot-time">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</div>
                                </div>
                              </el-checkbox>
                            </div>
                          </el-checkbox-group>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="form-actions">
                  <el-button 
                    type="primary" 
                    size="large"
                    @click="checkAndSubmitBatchAdd"
                    :loading="submittingBatch"
                  >
                    <el-icon><Plus /></el-icon>
                    批量添加空闲时间
                  </el-button>
                  <el-button @click="resetAddForm" size="large">
                    <el-icon><RefreshLeft /></el-icon>
                    重置表单
                  </el-button>
                </div>
              </el-form>
            </div>
          </div>
        </el-tab-pane>

        <!-- 批量删除空闲时间 -->
        <el-tab-pane label="批量删除空闲时间" name="delete">
          <div class="operation-content">
            <div class="operation-form">
              <el-form :model="deleteForm" label-width="120px" size="default">
                <!-- 周选择 -->
                <div class="form-section">
                  <div class="section-title">
                    <el-icon><Calendar /></el-icon>
                    选择周范围
                  </div>
                  <div class="section-content">
                    <WeekRangeSelector
                      :year="new Date().getFullYear()"
                      @change="onDeleteWeekSelectionChange"
                      :max-height="350"
                    />
                    <div class="week-info" v-if="selectedDeleteWeeks.length > 0">
                      <el-tag type="warning" size="small">
                        已选择 {{ selectedDeleteWeeks.length }} 个周: {{ getSelectedDeleteWeeksText() }}
                      </el-tag>
                    </div>
                  </div>
                </div>

                <!-- 筛选条件 -->
                <div class="form-section">
                  <div class="section-title">
                    <el-icon><Filter /></el-icon>
                    删除条件 <span class="optional-text">(可选)</span>
                  </div>
                  <div class="section-content">
                    <el-alert
                      title="删除规则说明"
                      type="warning"
                      :closable="false"
                      show-icon
                      class="delete-rules"
                    >
                      <ul>
                        <li>如果不选择任何星期，将删除所选周范围内的所有空闲时间记录</li>
                        <li>如果选择了星期但未选择时间段，将删除该星期的所有时间段</li>
                        <li>如果同时选择了星期和时间段，只删除匹配的特定记录</li>
                      </ul>
                    </el-alert>
                    
                    <div class="weekday-grid">
                      <div 
                        v-for="(dayName, dayIndex) in weekDayNames" 
                        :key="dayIndex"
                        class="weekday-card"
                        :class="{ 'active': deleteForm.weekdaySelections[dayIndex].enabled }"
                      >
                        <div class="weekday-header">
                          <el-checkbox 
                            v-model="deleteForm.weekdaySelections[dayIndex].enabled"
                            @change="toggleDeleteWeekday(dayIndex)"
                            size="large"
                          >
                            <span class="weekday-name">{{ dayName }}</span>
                          </el-checkbox>
                        </div>
                        <div 
                          v-if="deleteForm.weekdaySelections[dayIndex].enabled" 
                          class="time-slot-list"
                        >
                          <el-checkbox-group 
                            v-model="deleteForm.weekdaySelections[dayIndex].timeSlotIds"
                            size="small"
                          >
                            <div 
                              v-for="timeSlot in timeSlots" 
                              :key="timeSlot.id"
                              class="time-slot-item"
                            >
                              <el-checkbox :label="timeSlot.id">
                                <div class="time-slot-info">
                                  <div class="slot-name">{{ timeSlot.name }}</div>
                                  <div class="slot-time">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</div>
                                </div>
                              </el-checkbox>
                            </div>
                          </el-checkbox-group>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="form-actions">
                  <el-button 
                    type="danger" 
                    size="large"
                    @click="checkAndConfirmBatchDelete"
                    :loading="submittingDelete"
                  >
                    <el-icon><Delete /></el-icon>
                    批量删除空闲时间
                  </el-button>
                  <el-button @click="resetDeleteForm" size="large">
                    <el-icon><RefreshLeft /></el-icon>
                    重置表单
                  </el-button>
                </div>
              </el-form>
            </div>
          </div>
        </el-tab-pane>

        <!-- 我的空闲时间列表 -->
        <el-tab-pane label="我的空闲时间" name="list">
          <div class="operation-content">
            <div class="availability-list">
              <!-- 周导航控件 -->
              <div class="week-nav-controls">
                <div class="week-nav">
                  <el-button @click="goToPreviousListWeek" :icon="ArrowLeft" size="default">上一周</el-button>
                  <div class="current-week">
                    <h3>{{ listCurrentWeekText || '加载中...' }}</h3>
                    <div class="week-number-info">
                      <span class="week-number">第{{ currentWeekNumber }}周</span>
                    </div>
                    <el-button @click="goToCurrentListWeek" size="small" type="primary" link>回到本周</el-button>
                  </div>
                  <el-button @click="goToNextListWeek" :icon="ArrowRight" size="default">下一周</el-button>
                </div>
                
                <!-- 周次搜索 -->
                <div class="week-search">
                  <div class="search-input">
                    <el-input
                      v-model="weekSearchInput"
                      placeholder="输入周次跳转"
                      size="small"
                      style="width: 120px"
                      @keyup.enter="jumpToWeek"
                    >
                      <template #append>
                        <el-button @click="jumpToWeek" size="small">跳转</el-button>
                      </template>
                    </el-input>
                  </div>
                  <div class="search-hint">
                    <span>输入周次(1-{{ maxWeekNumber }})快速跳转</span>
                  </div>
                </div>
              </div>

              <!-- 空闲时间日历表格 -->
              <div class="availability-calendar" v-loading="loadingList">
                <div class="calendar-grid">
                  <!-- 表头 -->
                  <div class="calendar-header">
                    <div class="time-cell">时间段</div>
                    <div 
                      v-for="day in listWeekDays" 
                      :key="day.date" 
                      class="day-cell"
                      :class="{ 'today': isToday(day.date) }"
                    >
                      <div class="day-name">{{ day.name }}</div>
                      <div class="day-date">{{ formatDateShort(day.date) }}</div>
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
                    </div>
                    
                    <!-- 每天的可用性状态 -->
                    <div 
                      v-for="day in listWeekDays"
                      :key="`${timeSlot.id}-${day.date}`"
                      class="availability-cell"
                    >
                      <div 
                        class="availability-status"
                        :class="getMyAvailabilityClass(timeSlot.id, day.date)"
                      >
                        <div class="status-content">
                          <div class="my-availability-list">
                            <div 
                              v-for="availability in getMyAvailabilitiesForSlot(timeSlot.id, day.date)"
                              :key="availability.id"
                              class="my-availability-item"
                              :class="`priority-${availability.priority || 1}`"
                            >
                              <div class="availability-info">
                                <div class="priority-display">
                                  <span class="priority-stars">{{ '★'.repeat(availability.priority || 1) }}</span>
                                  <span class="priority-text">优先级{{ availability.priority || 1 }}</span>
                                </div>
                                <div v-if="availability.notes" class="notes-display">
                                  {{ availability.notes }}
                                </div>
                              </div>
                              <div class="availability-actions">
                                <el-button 
                                  class="action-btn edit-btn" 
                                  size="small" 
                                  type="primary" 
                                  @click="editMyAvailability(availability)"
                                  title="编辑"
                                >
                                  <el-icon><Edit /></el-icon>
                                </el-button>
                                <el-button 
                                  class="action-btn delete-btn" 
                                  size="small" 
                                  type="danger" 
                                  @click="confirmDeleteSingle(availability)"
                                  :loading="deletingIds.includes(availability.id)"
                                  title="删除"
                                >
                                  <el-icon><Delete /></el-icon>
                                </el-button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <el-empty 
                v-if="!loadingList && myAvailabilities.length === 0" 
                description="本周暂无空闲时间记录"
                :image-size="120"
              >
                <el-button type="primary" @click="activeTab = 'add'">
                  <el-icon><Plus /></el-icon>
                  添加空闲时间
                </el-button>
              </el-empty>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑我的空闲时间对话框 -->
    <el-dialog v-model="showEditMyDialog" title="编辑空闲时间" width="500px">
      <el-form :model="editMyForm" label-width="100px">
        <el-form-item label="日期">
          <el-date-picker
            v-model="editMyForm.date"
            type="date"
            disabled
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="优先级">
          <el-rate v-model="editMyForm.priority" show-text />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="editMyForm.notes" 
            type="textarea" 
            :rows="3"
            placeholder="可选：添加备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditMyDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEditMy" :loading="submittingBatch">
          保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, ArrowRight, Refresh, Calendar, Clock, Plus, Delete, RefreshLeft, Filter, Search, Edit
} from '@element-plus/icons-vue'
import WeekRangeSelector from '@/components/WeekRangeSelector.vue'
import { settingsService } from '@/utils/settingsService'
import { availabilityApi } from '@/services/api'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const activeTab = ref('add')
const timeSlots = ref([])
const selectedWeeks = ref([])
const selectedDeleteWeeks = ref([])
const submittingBatch = ref(false)
const submittingDelete = ref(false)

// 列表相关数据
const myAvailabilities = ref([])
const loadingList = ref(false)
const deletingIds = ref([])
const listCurrentWeek = ref(new Date())
const listWeekDays = ref([])
const listCurrentWeekText = ref('')
const showEditMyDialog = ref(false)
const currentWeekNumber = ref(1)
const weekSearchInput = ref('')
const maxWeekNumber = ref(52)
const editMyForm = reactive({
  id: '',
  employeeId: '',
  timeSlotId: '',
  date: '',
  priority: 3,
  notes: ''
})

// 星期名称映射
const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 批量添加表单
const batchForm = reactive({
  weekdaySelections: [
    { enabled: false, timeSlotIds: [] }, // 周日
    { enabled: false, timeSlotIds: [] }, // 周一
    { enabled: false, timeSlotIds: [] }, // 周二
    { enabled: false, timeSlotIds: [] }, // 周三
    { enabled: false, timeSlotIds: [] }, // 周四
    { enabled: false, timeSlotIds: [] }, // 周五
    { enabled: false, timeSlotIds: [] }, // 周六
  ]
})

// 批量删除表单
const deleteForm = reactive({
  weekdaySelections: [
    { enabled: false, timeSlotIds: [] }, // 周日
    { enabled: false, timeSlotIds: [] }, // 周一
    { enabled: false, timeSlotIds: [] }, // 周二
    { enabled: false, timeSlotIds: [] }, // 周三
    { enabled: false, timeSlotIds: [] }, // 周四
    { enabled: false, timeSlotIds: [] }, // 周五
    { enabled: false, timeSlotIds: [] }, // 周六
  ]
})

// 计算属性
const canSubmitAdd = computed(() => {
  return selectedWeeks.value.length > 0 && 
         batchForm.weekdaySelections.some(sel => sel.enabled && sel.timeSlotIds.length > 0)
})

const canSubmitDelete = computed(() => {
  return selectedDeleteWeeks.value.length > 0
})

// 工具函数
const getSelectedWeeksText = () => {
  if (selectedWeeks.value.length === 0) return ''
  const sorted = [...selectedWeeks.value].sort((a, b) => a - b)
  return `第${sorted.join('、')}周`
}

const getSelectedDeleteWeeksText = () => {
  if (selectedDeleteWeeks.value.length === 0) return ''
  const sorted = [...selectedDeleteWeeks.value].sort((a, b) => a - b)
  return `第${sorted.join('、')}周`
}

// 事件处理函数
const onWeekSelectionChange = (weeks) => {
  selectedWeeks.value = weeks
}

const onDeleteWeekSelectionChange = (weeks) => {
  selectedDeleteWeeks.value = weeks
}

const toggleWeekday = (dayIndex) => {
  if (!batchForm.weekdaySelections[dayIndex].enabled) {
    batchForm.weekdaySelections[dayIndex].timeSlotIds = []
  }
}

const toggleDeleteWeekday = (dayIndex) => {
  if (!deleteForm.weekdaySelections[dayIndex].enabled) {
    deleteForm.weekdaySelections[dayIndex].timeSlotIds = []
  }
}

const resetAddForm = () => {
  selectedWeeks.value = []
  batchForm.weekdaySelections.forEach(selection => {
    selection.enabled = false
    selection.timeSlotIds = []
  })
}

const resetDeleteForm = () => {
  selectedDeleteWeeks.value = []
  deleteForm.weekdaySelections.forEach(selection => {
    selection.enabled = false
    selection.timeSlotIds = []
  })
}

// 检查并提交批量添加
const checkAndSubmitBatchAdd = async () => {
  const missingItems = []
  
  // 检查是否选择了周期
  if (selectedWeeks.value.length === 0) {
    missingItems.push('周范围')
  }
  
  // 检查是否至少选择了一个星期几的时间段
  const hasValidSelection = batchForm.weekdaySelections.some(
    selection => selection.enabled && selection.timeSlotIds.length > 0
  )
  
  if (!hasValidSelection) {
    missingItems.push('至少一个星期几的时间段')
  }
  
  if (missingItems.length > 0) {
    ElMessage.warning(`请先选择：${missingItems.join('、')}`)
    return
  }
  
  // 如果所有必要信息都已填写，继续执行添加操作
  await submitBatchAdd()
}

// 根据年份和周数获取周开始日期（使用系统设置）
const getWeekStartDate = async (year, weekNumber) => {
  try {
    // 获取系统设置的周起始日期
    const systemWeekStartDate = await settingsService.getWeekStartDate()
    
    // 计算目标周的开始日期
    const targetWeekStart = new Date(systemWeekStartDate)
    targetWeekStart.setDate(systemWeekStartDate.getDate() + (weekNumber - 1) * 7)
    
    return targetWeekStart
  } catch (error) {
    console.error('获取周开始日期失败:', error)
    // 回退到传统 ISO 8601 计算
    const jan1 = new Date(year, 0, 1)
    const jan1DayOfWeek = jan1.getDay()
    const firstMonday = new Date(jan1)
    const daysToFirstMonday = jan1DayOfWeek === 0 ? 1 : 8 - jan1DayOfWeek
    firstMonday.setDate(jan1.getDate() + daysToFirstMonday)
    
    const targetWeekStart = new Date(firstMonday)
    targetWeekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
    
    return targetWeekStart
  }
}

// 计算指定日期是第几周
const calculateWeekNumber = async (date) => {
  try {
    // 获取系统设置的周起始日期
    const systemWeekStartDate = await settingsService.getWeekStartDate()
    const targetDate = new Date(date)
    
    // 计算从系统周起始日期到目标日期的天数差
    const daysDiff = Math.floor((targetDate - systemWeekStartDate) / (1000 * 60 * 60 * 24))
    
    // 计算周次（从1开始）
    const weekNumber = Math.floor(daysDiff / 7) + 1
    
    return Math.max(1, weekNumber)
  } catch (error) {
    console.error('计算周次失败:', error)
    // 回退到传统 ISO 8601 周计算
    const year = date.getFullYear()
    const start = new Date(year, 0, 1)
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + start.getDay() + 1) / 7)
  }
}

// 根据周次跳转到指定周
const jumpToWeek = async () => {
  const weekNum = parseInt(weekSearchInput.value)
  
  if (!weekNum || weekNum < 1 || weekNum > maxWeekNumber.value) {
    ElMessage.warning(`请输入有效的周次 (1-${maxWeekNumber.value})`)
    return
  }
  
  try {
    const targetWeekStart = await getWeekStartDate(new Date().getFullYear(), weekNum)
    listCurrentWeek.value = targetWeekStart
    await updateCurrentWeekNumber()
    await calculateListWeekDays()
    await updateListWeekRangeText()
    await fetchMyAvailabilities()
    weekSearchInput.value = ''
    ElMessage.success(`已跳转到第${weekNum}周`)
  } catch (error) {
    console.error('跳转周次失败:', error)
    ElMessage.error('跳转失败，请重试')
  }
}

// 更新当前周次
const updateCurrentWeekNumber = async () => {
  try {
    currentWeekNumber.value = await calculateWeekNumber(listCurrentWeek.value)
  } catch (error) {
    console.error('更新当前周次失败:', error)
    currentWeekNumber.value = 1
  }
}

// 计算年度最大周数
const calculateMaxWeekNumber = async () => {
  try {
    const year = new Date().getFullYear()
    const nextYearStart = new Date(year + 1, 0, 1)
    const lastDayOfYear = new Date(nextYearStart.getTime() - 24 * 60 * 60 * 1000)
    maxWeekNumber.value = await calculateWeekNumber(lastDayOfYear)
  } catch (error) {
    console.error('计算最大周数失败:', error)
    maxWeekNumber.value = 52
  }
}

// 批量添加空闲时间
const submitBatchAdd = async () => {
  if (!canSubmitAdd.value) {
    ElMessage.error('请检查表单填写是否完整')
    return
  }

  submittingBatch.value = true
  
  try {
    let successCount = 0
    let totalCount = 0
    
    for (const weekNumber of selectedWeeks.value) {
      const weekStartDate = await getWeekStartDate(new Date().getFullYear(), weekNumber)
      
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const weekdaySelection = batchForm.weekdaySelections[dayIndex]
        
        if (weekdaySelection.enabled && weekdaySelection.timeSlotIds.length > 0) {
          const currentDate = new Date(weekStartDate)
          console.log(`员工界面-选择的dayIndex=${dayIndex}(${weekDayNames[dayIndex]}), weekStartDate=${weekStartDate.toDateString()}(星期${weekStartDate.getDay()})`)
          
          // 根据weekStartDate的实际星期几来计算偏移
          const weekStartDay = weekStartDate.getDay()  // 0=周日, 1=周一, ..., 6=周六
          
          // 计算从weekStartDate到目标dayIndex的天数差
          let daysDiff = dayIndex - weekStartDay
          if (daysDiff < 0) {
            daysDiff += 7  // 如果是上一周的日期，加7天
          }
          
          currentDate.setDate(weekStartDate.getDate() + daysDiff)
          console.log(`员工界面-目标日期: ${currentDate.toDateString()}(星期${currentDate.getDay()})`)
          
          for (const timeSlotId of weekdaySelection.timeSlotIds) {
            totalCount++
            try {
              await availabilityApi.createAvailability({
                employeeId: userStore.userInfo.id,
                timeSlotId: timeSlotId,
                date: currentDate.toISOString().split('T')[0],
                priority: 3
              })
              successCount++
            } catch (error) {
              console.error(`创建空闲时间失败:`, error)
              // 如果是重复记录错误（409状态码），我们认为这是成功的，因为记录已存在
              if (error.response?.status === 409) {
                successCount++
              }
            }
          }
        }
      }
    }
    
    if (successCount === totalCount) {
      ElMessage.success(`成功批量添加 ${successCount} 条空闲时间记录`)
    } else {
      ElMessage.warning(`已添加 ${successCount}/${totalCount} 条空闲时间记录，部分失败可能由于重复记录`)
    }
    
    resetAddForm()
    
    // 如果当前在列表选项卡，刷新列表
    if (activeTab.value === 'list') {
      fetchMyAvailabilities()
    }
  } catch (error) {
    console.error('批量添加空闲时间失败:', error)
    ElMessage.error('批量添加空闲时间失败，请重试')
  } finally {
    submittingBatch.value = false
  }
}

// 检查并确认批量删除
const checkAndConfirmBatchDelete = async () => {
  const missingItems = []
  
  // 检查是否选择了周期
  if (selectedDeleteWeeks.value.length === 0) {
    missingItems.push('周范围')
  }
  
  if (missingItems.length > 0) {
    ElMessage.warning(`请先选择：${missingItems.join('、')}`)
    return
  }
  
  // 如果所有必要信息都已填写，继续执行删除确认
  await confirmBatchDelete()
}

// 确认批量删除
const confirmBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '确认要删除选中周范围内的空闲时间记录吗？此操作不可撤销。',
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await submitBatchDelete()
  } catch {
    // 用户取消删除
  }
}

// 批量删除空闲时间
const submitBatchDelete = async () => {
  if (!canSubmitDelete.value) {
    ElMessage.error('请至少选择一个周')
    return
  }

  submittingDelete.value = true
  
  try {
    let successCount = 0
    let totalAttempts = 0
    
    // 获取我的现有空闲时间记录
    const myAvailabilityResponse = await availabilityApi.getAvailabilities({
      employeeId: userStore.userInfo.id
    })
    const myAvailabilities = Array.isArray(myAvailabilityResponse.data) ? 
      myAvailabilityResponse.data : 
      (myAvailabilityResponse.data?.data || [])
    
    for (const weekNumber of selectedDeleteWeeks.value) {
      const weekStartDate = await getWeekStartDate(new Date().getFullYear(), weekNumber)
      
      // 筛选该周的空闲时间记录
      const weekAvailabilities = myAvailabilities.filter(availability => {
        const availableDate = new Date(availability.date)
        const weekStart = new Date(weekStartDate)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        return availableDate >= weekStart && availableDate <= weekEnd
      })
      
      for (const availability of weekAvailabilities) {
        const availableDate = new Date(availability.date)
        const dayOfWeek = availableDate.getDay()
        const weekdaySelection = deleteForm.weekdaySelections[dayOfWeek]
        
        // 检查是否需要删除这条记录
        let shouldDelete = false
        
        if (weekdaySelection.enabled) {
          // 如果选择了具体的时间段，只删除匹配的时间段
          if (weekdaySelection.timeSlotIds.length > 0) {
            shouldDelete = weekdaySelection.timeSlotIds.includes(availability.timeSlotId)
          } else {
            // 如果选择了星期但没有选择时间段，删除该星期的所有记录
            shouldDelete = true
          }
        } else {
          // 如果没有选择任何星期，删除所有记录
          const hasAnyWeekdayEnabled = deleteForm.weekdaySelections.some(sel => sel.enabled)
          shouldDelete = !hasAnyWeekdayEnabled
        }
        
        if (shouldDelete) {
          totalAttempts++
          try {
            await availabilityApi.deleteAvailability(availability.id)
            successCount++
          } catch (error) {
            console.error(`删除空闲时间失败:`, error)
          }
        }
      }
    }
    
    if (successCount === totalAttempts) {
      ElMessage.success(`成功批量删除 ${successCount} 条空闲时间记录`)
    } else {
      ElMessage.warning(`已删除 ${successCount}/${totalAttempts} 条空闲时间记录`)
    }
    
    resetDeleteForm()
    
    // 如果当前在列表选项卡，刷新列表
    if (activeTab.value === 'list') {
      fetchMyAvailabilities()
    }
  } catch (error) {
    console.error('批量删除空闲时间失败:', error)
    ElMessage.error('批量删除空闲时间失败，请重试')
  } finally {
    submittingDelete.value = false
  }
}

// 数据获取
const fetchTimeSlots = async () => {
  try {
    const response = await availabilityApi.getTimeSlots()
    console.log('时间段API响应:', response)
    
    // 尝试处理多种可能的数据结构
    let data = response.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // 如果是嵌套对象，尝试获取data字段
      data = data.data || data.timeSlots || data.items || []
    }
    timeSlots.value = Array.isArray(data) ? data : []
    console.log('处理后的时间段数据:', timeSlots.value)
  } catch (error) {
    console.error('获取时间段失败:', error)
    timeSlots.value = []
    ElMessage.error('获取时间段失败')
  }
}

const refreshData = () => {
  fetchTimeSlots()
  if (activeTab.value === 'list') {
    fetchMyAvailabilities()
  }
}

// 列表相关函数
const fetchMyAvailabilities = async () => {
  loadingList.value = true
  try {
    const params = {
      employeeId: userStore.userInfo.id
    }
    
    // 获取当前选中周的数据
    const startOfWeek = await getStartOfWeek(listCurrentWeek.value)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    params.startDate = startOfWeek.toISOString().split('T')[0]
    params.endDate = endOfWeek.toISOString().split('T')[0]
    
    console.log('获取空闲时间参数:', params)
    
    const response = await availabilityApi.getAvailabilities(params)
    console.log('空闲时间API响应:', response)
    
    // 尝试处理多种可能的数据结构
    let data = response.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // 如果是嵌套对象，尝试获取data字段
      data = data.data || data.availabilities || data.items || []
    }
    myAvailabilities.value = Array.isArray(data) ? data : []
    console.log('处理后的空闲时间数据:', myAvailabilities.value)
    
  } catch (error) {
    console.error('获取我的空闲时间失败:', error)
    ElMessage.error('获取空闲时间列表失败')
    myAvailabilities.value = []
  } finally {
    loadingList.value = false
  }
}


// 单个删除确认
const confirmDeleteSingle = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认要删除 ${formatDate(row.date)} ${getWeekDayName(row.date)} 的 ${row.timeSlot?.name || '未知时间段'} 空闲时间记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    await deleteSingleAvailability(row)
  } catch {
    // 用户取消删除
  }
}

// 删除单个空闲时间
const deleteSingleAvailability = async (row) => {
  deletingIds.value.push(row.id)
  try {
    await availabilityApi.deleteAvailability(row.id)
    ElMessage.success('删除成功')
    // 重新获取列表
    fetchMyAvailabilities()
  } catch (error) {
    console.error('删除空闲时间失败:', error)
    ElMessage.error('删除失败，请重试')
  } finally {
    deletingIds.value = deletingIds.value.filter(id => id !== row.id)
  }
}

// 工具函数
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  const d = new Date(datetime)
  return `${formatDate(datetime)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDateShort = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const isToday = (date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const getWeekDayName = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return weekDayNames[d.getDay()]
}

// 获取一周的开始日期（使用系统设置）
const getStartOfWeek = async (date) => {
  try {
    return await settingsService.calculateWeekStart(date)
  } catch (error) {
    console.error('计算周开始日期失败:', error)
    // 回退到传统计算：周一作为周开始
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }
}

// 计算列表视图的周天数
const calculateListWeekDays = async () => {
  try {
    const startOfWeek = await getStartOfWeek(listCurrentWeek.value)
    console.log('周开始日期:', startOfWeek)
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({
        date: date,
        name: weekDayNames[date.getDay()]
      })
    }
    listWeekDays.value = days
    console.log('计算的周天数:', listWeekDays.value)
  } catch (error) {
    console.error('计算列表周天数失败:', error)
    listWeekDays.value = []
  }
}

// 更新列表视图周范围文本
const updateListWeekRangeText = async () => {
  try {
    const start = await getStartOfWeek(listCurrentWeek.value)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    listCurrentWeekText.value = `${formatDateShort(start)} - ${formatDateShort(end)}`
  } catch (error) {
    console.error('更新列表周范围文本失败:', error)
    listCurrentWeekText.value = formatDateShort(listCurrentWeek.value)
  }
}

// 列表视图周导航
const goToPreviousListWeek = async () => {
  const newDate = new Date(listCurrentWeek.value)
  newDate.setDate(newDate.getDate() - 7)
  listCurrentWeek.value = newDate
  await updateCurrentWeekNumber()
  await calculateListWeekDays()
  await updateListWeekRangeText()
  await fetchMyAvailabilities()
}

const goToNextListWeek = async () => {
  const newDate = new Date(listCurrentWeek.value)
  newDate.setDate(newDate.getDate() + 7)
  listCurrentWeek.value = newDate
  await updateCurrentWeekNumber()
  await calculateListWeekDays()
  await updateListWeekRangeText()
  await fetchMyAvailabilities()
}

const goToCurrentListWeek = async () => {
  listCurrentWeek.value = new Date()
  await updateCurrentWeekNumber()
  await calculateListWeekDays()
  await updateListWeekRangeText()
  await fetchMyAvailabilities()
}

// 获取指定时间段和日期的我的空闲时间
const getMyAvailabilitiesForSlot = (timeSlotId, date) => {
  const dateStr = date.toISOString().split('T')[0]
  return myAvailabilities.value.filter(
    a => (a.timeSlotId === timeSlotId || a.time_slot_id === timeSlotId) && a.date === dateStr
  )
}

// 获取我的空闲时间状态类
const getMyAvailabilityClass = (timeSlotId, date) => {
  const items = getMyAvailabilitiesForSlot(timeSlotId, date)
  if (items.length === 0) return 'empty'
  return 'has-my-availability'
}

// 编辑我的空闲时间
const editMyAvailability = (availability) => {
  editMyForm.id = availability.id
  editMyForm.employeeId = availability.employeeId || availability.employee_id
  editMyForm.timeSlotId = availability.timeSlotId || availability.time_slot_id
  editMyForm.date = availability.date
  editMyForm.priority = availability.priority || 3
  editMyForm.notes = availability.notes || ''
  showEditMyDialog.value = true
}

// 提交编辑我的空闲时间
const submitEditMy = async () => {
  try {
    submittingBatch.value = true
    const data = {
      priority: editMyForm.priority,
      notes: editMyForm.notes
    }
    
    await availabilityApi.updateAvailability(editMyForm.id, data)
    showEditMyDialog.value = false
    await fetchMyAvailabilities()
    ElMessage.success('修改成功')
  } catch (error) {
    console.error('修改失败:', error)
    ElMessage.error('修改失败')
  } finally {
    submittingBatch.value = false
  }
}

// 监听选项卡变化
watch(activeTab, async (newTab) => {
  if (newTab === 'list') {
    await updateCurrentWeekNumber()
    await calculateListWeekDays()
    await updateListWeekRangeText()
    await fetchMyAvailabilities()
  }
})

// 生命周期
onMounted(async () => {
  await fetchTimeSlots()
  // 计算最大周数
  await calculateMaxWeekNumber()
  // 初始化列表视图数据
  await updateCurrentWeekNumber()
  await calculateListWeekDays()
  await updateListWeekRangeText()
  // 如果默认选中列表选项卡，则获取数据
  if (activeTab.value === 'list') {
    await fetchMyAvailabilities()
  }
})
</script>

<style lang="scss" scoped>
.availability-management {
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    
    .header-info {
      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 600;
        color: #1a202c;
      }
      
      p {
        margin: 0;
        font-size: 14px;
        color: #718096;
      }
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.operations-card {
  .operation-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 24px;
    }
    
    :deep(.el-tabs__item) {
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
    }
  }
}

.operation-content {
  .operation-form {
    max-width: 1200px;
    margin: 0 auto;
  }
}

.form-section {
  margin-bottom: 32px;
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e4e7ed;
    
    .optional-text {
      font-size: 12px;
      color: #909399;
      font-weight: normal;
    }
  }
  
  .section-content {
    padding: 0 8px;
  }
}

.week-info {
  margin-top: 12px;
  padding: 8px 0;
}

.delete-rules {
  margin-bottom: 20px;
  
  ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
    
    li {
      margin-bottom: 4px;
      font-size: 13px;
    }
  }
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.weekday-card {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  transition: all 0.3s ease;
  
  &.active {
    border-color: #409eff;
    background: #f0f9ff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }
  
  .weekday-header {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
    
    .weekday-name {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .time-slot-list {
    .time-slot-item {
      margin-bottom: 12px;
      padding: 8px;
      border-radius: 6px;
      background: #f9f9f9;
      transition: all 0.2s;
      
      &:hover {
        background: #f0f9ff;
      }
      
      .time-slot-info {
        .slot-name {
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          margin-bottom: 2px;
        }
        
        .slot-time {
          font-size: 12px;
          color: #606266;
        }
      }
    }
  }
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
  border-top: 1px solid #e4e7ed;
  margin-top: 32px;
}

// 响应式设计
@media (max-width: 768px) {
  .page-header {
    .header-content {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
      
      .header-info {
        h1 {
          font-size: 24px;
        }
      }
      
      .header-actions {
        justify-content: flex-end;
      }
    }
  }
  
  .weekday-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
    align-items: center;
    
    .el-button {
      width: 100%;
      max-width: 300px;
    }
  }
}

// 列表选项卡样式
.availability-list {
    .week-nav-controls {
      margin-bottom: 24px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      
      .week-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        margin-bottom: 16px;
        
        .current-week {
          text-align: center;
          
          h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
            font-weight: 600;
            color: #303133;
          }
          
          .week-number-info {
            margin: 4px 0;
            
            .week-number {
              display: inline-block;
              font-size: 14px;
              font-weight: 500;
              color: #409eff;
              background: #ecf5ff;
              padding: 2px 8px;
              border-radius: 12px;
              border: 1px solid #b3d8ff;
            }
          }
        }
      }
      
      .week-search {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        
        .search-input {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .search-hint {
          font-size: 12px;
          color: #909399;
        }
      }
    }
    
    .availability-calendar {
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
            background: #dcfce7;
            color: #22c55e;
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
        min-height: 80px;
        
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
        }
        
        .availability-cell {
          padding: 8px;
          border-right: 1px solid #e4e7ed;
          
          .availability-status {
            height: 100%;
            border-radius: 4px;
            
            &.empty {
              background: #fafafa;
              border: 1px dashed #d9d9d9;
            }
            
            &.has-my-availability {
              background: #dcfce7;
              border: 1px solid #22c55e;
            }
          }
          
          .status-content {
            padding: 4px;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .my-availability-list {
            flex: 1;
          }
          
          .my-availability-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 11px;
            padding: 8px;
            margin-bottom: 4px;
            border-radius: 6px;
            position: relative;
            background: #f0f9ff;
            border: 1px solid #b3d8ff;
            
            &.priority-1 { 
              background: #fff2e8; 
              border-color: #ffd4a3;
            }
            &.priority-2 { 
              background: #fff7e6; 
              border-color: #ffe7ba;
            }
            &.priority-3 { 
              background: #f6ffed; 
              border-color: #b7eb8f;
            }
            &.priority-4 { 
              background: #e6f4ff; 
              border-color: #91d5ff;
            }
            &.priority-5 { 
              background: #f9f0ff; 
              border-color: #d3adf7;
            }
            
            &:hover {
              .availability-actions {
                opacity: 1;
              }
            }
            
            .availability-info {
              flex: 1;
              
              .priority-display {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 4px;
                
                .priority-stars {
                  color: #faad14;
                  font-size: 10px;
                }
                
                .priority-text {
                  font-size: 10px;
                  color: #606266;
                }
              }
              
              .notes-display {
                font-size: 10px;
                color: #909399;
                line-height: 1.4;
                max-height: 28px;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }
            
            .availability-actions {
              display: flex;
              gap: 2px;
              opacity: 0;
              transition: opacity 0.2s;
              position: absolute;
              top: 4px;
              right: 4px;
              
              .action-btn {
                width: 16px;
                height: 16px;
                padding: 0;
                font-size: 10px;
                border: none;
                
                &.edit-btn {
                  background: #409eff;
                  color: white;
                  
                  &:hover {
                    background: #66b1ff;
                  }
                }
                
                &.delete-btn {
                  background: #f56c6c;
                  color: white;
                  
                  &:hover {
                    background: #f78989;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .availability-calendar {
      overflow-x: auto;
      
      .calendar-header,
      .time-row {
        min-width: 800px;
      }
    }
  }

  @media (max-width: 768px) {
    .availability-list {
      .week-nav-controls {
        .week-nav {
          flex-direction: column;
          gap: 12px;
        }
        
        .week-search {
          .search-input {
            flex-direction: column;
            
            :deep(.el-input) {
              width: 200px !important;
            }
          }
        }
      }
    }
    
    .availability-calendar {
      .calendar-header,
      .time-row {
        min-width: 600px;
      }
    }
  }
</style>