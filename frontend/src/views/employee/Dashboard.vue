<template>
  <div class="employee-dashboard-container">
    <!-- 欢迎头部 -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h1>👋 欢迎，{{ userStore.username }}！</h1>
        <p>今天是 {{ formatDate(new Date()) }}，{{ getTimeGreeting() }}</p>
      </div>
      <div class="today-info">
        <el-tag type="success" size="large">{{ todayWeekRangeText }}</el-tag>
        <div class="last-update">
          <el-text type="info" size="small">
            数据更新: {{ lastUpdateTime }}
          </el-text>
        </div>
      </div>
    </div>


    <!-- 本周值班表 -->
    <el-card class="schedule-overview" v-loading="loading">
      <template #header>
        <div class="section-header">
          <div class="header-content">
            <h2>📅 值班表</h2>
            <p>查看完整的排班安排，您的排班会特别标注</p>
          </div>
          <div class="header-actions">
            <el-button size="small" @click="goToPreviousWeek">
              <el-icon><ArrowLeft /></el-icon>
              上周
            </el-button>
            <div class="current-week-info">
              <div class="week-range">{{ weekRangeText }}</div>
              <div class="week-number">
                <el-tag type="primary" size="small">第{{ currentWeekNumber }}周</el-tag>
              </div>
            </div>
            <el-button size="small" @click="goToNextWeek">
              下周
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <!-- 桌面端表格视图 -->
      <div class="schedule-calendar desktop-view">
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
            <div class="required-people">需要{{ timeSlot.requiredPeople }}人</div>
          </div>
          
          <!-- 每天的排班状态 -->
          <div 
            v-for="day in weekDays"
            :key="`${timeSlot.id}-${day.date}`"
            class="schedule-cell"
          >
            <div class="schedule-content">
              <!-- 已排班的员工 -->
              <div 
                v-for="schedule in getSchedulesForSlot(timeSlot.id, day.date)"
                :key="schedule.id"
                class="scheduled-employee"
                :class="{ 
                  'my-schedule': schedule.employee?.id === userStore.userInfo?.id,
                  'other-schedule': schedule.employee?.id !== userStore.userInfo?.id
                }"
                @click="showScheduleDetails(schedule)"
              >
                <div class="employee-info">
                  <span class="employee-name">{{ schedule.employee?.name }}</span>
                  <span v-if="schedule.employee?.id === userStore.userInfo?.id" class="my-badge">我</span>
                </div>
              </div>

              <!-- 空缺提示 -->
              <div 
                v-if="getNeedMorePeople(timeSlot.id, day.date) > 0"
                class="vacancy-slot"
              >
                <el-icon><Plus /></el-icon>
                <span>还需{{ getNeedMorePeople(timeSlot.id, day.date) }}人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 手机端列表视图 -->
      <div class="schedule-list mobile-view">
        <div 
          v-for="day in weekDays" 
          :key="day.date"
          class="day-schedule"
        >
          <div class="day-header" :class="{ 'today': isToday(day.date) }">
            <div class="day-info">
              <span class="day-name">{{ day.name }}</span>
              <span class="day-date">{{ formatDateShort(day.date) }}</span>
            </div>
            <div class="day-status">
              <div class="my-shifts">我的: {{ getMySchedulesForDay(day.date).length }}</div>
              <div class="total-shifts">总计: {{ getSchedulesForDay(day.date).length }}</div>
            </div>
          </div>
          
          <div class="day-time-slots">
            <div 
              v-for="timeSlot in timeSlots" 
              :key="timeSlot.id"
              class="time-slot-card"
            >
              <div class="slot-header">
                <div class="slot-info">
                  <div class="slot-name">{{ timeSlot.name }}</div>
                  <div class="slot-time">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</div>
                </div>
                <div class="slot-status">
                  <el-tag 
                    :type="getNeedMorePeople(timeSlot.id, day.date) === 0 ? 'success' : 'warning'" 
                    size="small"
                  >
                    {{ getSchedulesForSlot(timeSlot.id, day.date).length }}/{{ timeSlot.requiredPeople }}
                  </el-tag>
                </div>
              </div>
              
              <div class="slot-employees">
                <div 
                  v-for="schedule in getSchedulesForSlot(timeSlot.id, day.date)"
                  :key="schedule.id"
                  class="employee-chip"
                  :class="{ 
                    'my-chip': schedule.employee?.id === userStore.userInfo?.id,
                    'other-chip': schedule.employee?.id !== userStore.userInfo?.id
                  }"
                  @click="showScheduleDetails(schedule)"
                >
                  {{ schedule.employee?.name }}
                  <span v-if="schedule.employee?.id === userStore.userInfo?.id" class="me-badge">我</span>
                </div>
                
                <div 
                  v-if="getNeedMorePeople(timeSlot.id, day.date) > 0"
                  class="add-employee-chip"
                >
                  <el-icon><Plus /></el-icon>
                  <span>+{{ getNeedMorePeople(timeSlot.id, day.date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 排班统计摘要 -->
      <div class="schedule-summary">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6" :span="6">
            <div class="summary-item">
              <span class="label">总班次</span>
              <span class="value">{{ weekScheduleStats.total }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6" :span="6">
            <div class="summary-item">
              <span class="label">已安排</span>
              <span class="value success">{{ weekScheduleStats.assigned }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6" :span="6">
            <div class="summary-item">
              <span class="label">我的班次</span>
              <span class="value primary">{{ weekScheduleStats.myShifts }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6" :span="6">
            <div class="summary-item">
              <span class="label">完成率</span>
              <span class="value">{{ weekScheduleStats.completionRate }}%</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :span="6">
          <el-card class="action-card" @click="$router.push('/employee/shift-requests')" shadow="hover">
            <div class="action-content">
              <div class="action-icon">
                <el-icon><Switch /></el-icon>
              </div>
              <div class="action-info">
                <div class="action-title">申请调班</div>
                <div class="action-desc">提交调班申请</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :span="6">
          <el-card class="action-card" @click="$router.push('/employee/availability')" shadow="hover">
            <div class="action-content">
              <div class="action-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="action-info">
                <div class="action-title">空闲时间</div>
                <div class="action-desc">管理我的空闲时间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :span="6">
          <el-card class="action-card" @click="exportMySchedule" shadow="hover">
            <div class="action-content">
              <div class="action-icon">
                <el-icon><Download /></el-icon>
              </div>
              <div class="action-info">
                <div class="action-title">导出我的排班</div>
                <div class="action-desc">下载个人排班表</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :span="6">
          <el-card class="action-card" @click="refreshData" shadow="hover">
            <div class="action-content">
              <div class="action-icon">
                <el-icon><Refresh /></el-icon>
              </div>
              <div class="action-info">
                <div class="action-title">刷新数据</div>
                <div class="action-desc">更新最新信息</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 排班详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="排班详情" width="500px">
      <div v-if="selectedSchedule" class="schedule-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="员工姓名">
            {{ selectedSchedule.employee?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            {{ selectedSchedule.employee?.role === 'admin' ? '管理员' : '员工' }}
          </el-descriptions-item>
          <el-descriptions-item label="排班日期">
            {{ selectedSchedule.schedule_date }}
          </el-descriptions-item>
          <el-descriptions-item label="时间段">
            {{ selectedSchedule.timeSlot?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="工作时间" :span="2">
            {{ selectedSchedule.timeSlot?.startTime }} - {{ selectedSchedule.timeSlot?.endTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedSchedule.notes" label="备注" :span="2">
            {{ selectedSchedule.notes }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button 
          v-if="selectedSchedule?.employee?.id === userStore.userInfo?.id"
          type="primary" 
          @click="requestShiftChange"
        >
          申请调班
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { 
  Switch, Download, Refresh, Plus, ArrowLeft, ArrowRight, Calendar
} from '@element-plus/icons-vue'
import { scheduleApi, employeeApi, availabilityApi } from '@/services/api'
import { settingsService } from '@/utils/settingsService'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const lastUpdateTime = ref('未更新')
const schedules = ref([])
const employees = ref([])
const timeSlots = ref([])
const currentWeek = ref(new Date())
const showDetailDialog = ref(false)
const selectedSchedule = ref(null)
const currentWeekNumber = ref(1)
const weekDays = ref([])
const weekRangeText = ref('加载中...')
const todayWeekRangeText = ref('加载中...')



// 计算属性

const weekScheduleStats = computed(() => {
  const total = timeSlots.value.reduce((sum, slot) => sum + (slot.requiredPeople * 7), 0)
  const assigned = schedules.value.length
  const myShifts = schedules.value.filter(s => s.employee?.id === userStore.userInfo?.id).length
  
  return {
    total,
    assigned,
    myShifts,
    completionRate: total > 0 ? Math.round((assigned / total) * 100) : 0
  }
})

// 工具函数
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

const formatDate = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  })
}

const formatDateShort = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const formatWeekRange = async (date) => {
  try {
    const start = await getStartOfWeek(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${formatDateShort(start)} - ${formatDateShort(end)}`
  } catch (error) {
    console.error('格式化周范围失败:', error)
    return '加载中...'
  }
}

// 计算周天数
const calculateWeekDays = async () => {
  try {
    const startOfWeek = await getStartOfWeek(currentWeek.value)
    const days = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({
        date: date,
        name: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
      })
    }
    weekDays.value = days
  } catch (error) {
    console.error('计算周天数失败:', error)
    weekDays.value = []
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



// 更新当前周次
const updateCurrentWeekNumber = async () => {
  try {
    currentWeekNumber.value = await calculateWeekNumber(currentWeek.value)
  } catch (error) {
    console.error('更新当前周次失败:', error)
    currentWeekNumber.value = 1
  }
}


// 更新周范围文本
const updateWeekRangeText = async () => {
  try {
    weekRangeText.value = await formatWeekRange(currentWeek.value)
  } catch (error) {
    console.error('更新周范围文本失败:', error)
    weekRangeText.value = '加载失败'
  }
}

// 更新今天的周范围文本
const updateTodayWeekRangeText = async () => {
  try {
    todayWeekRangeText.value = await formatWeekRange(new Date())
  } catch (error) {
    console.error('更新今天周范围文本失败:', error)
    todayWeekRangeText.value = '加载失败'
  }
}

const isToday = (date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const getTimeGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

// 获取指定时间段和日期的排班
const getSchedulesForSlot = (timeSlotId, date) => {
  const dateStr = date.toISOString().split('T')[0]
  return schedules.value.filter(
    s => s.time_slot_id === timeSlotId && s.schedule_date === dateStr
  )
}

// 获取指定日期的所有排班
const getSchedulesForDay = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  return schedules.value.filter(
    s => s.schedule_date === dateStr
  )
}

// 获取指定日期我的排班
const getMySchedulesForDay = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  return schedules.value.filter(
    s => s.schedule_date === dateStr && s.employee?.id === userStore.userInfo?.id
  )
}

// 获取需要补充的人数
const getNeedMorePeople = (timeSlotId, date) => {
  const slot = timeSlots.value.find(s => s.id === timeSlotId)
  if (!slot) return 0
  const assigned = getSchedulesForSlot(timeSlotId, date).length
  return Math.max(0, slot.requiredPeople - assigned)
}

// 周导航
const goToPreviousWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeek.value = newDate
  await updateCurrentWeekNumber()
  await calculateWeekDays()
  await updateWeekRangeText()
}

const goToNextWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeek.value = newDate
  await updateCurrentWeekNumber()
  await calculateWeekDays()
  await updateWeekRangeText()
}

// 事件处理
const showScheduleDetails = (schedule) => {
  selectedSchedule.value = schedule
  showDetailDialog.value = true
}

const requestShiftChange = () => {
  showDetailDialog.value = false
  router.push('/employee/shift-requests')
}

const exportMySchedule = () => {
  ElMessage.info('导出功能开发中')
}

const refreshData = async () => {
  await Promise.all([
    fetchEmployees(),
    fetchTimeSlots()
  ])
  await fetchSchedules()
}


// 数据获取
const fetchSchedules = async () => {
  try {
    loading.value = true
    
    const startOfWeek = await getStartOfWeek(currentWeek.value)
    const startDate = startOfWeek.toISOString().split('T')[0]
    const endDate = new Date(startOfWeek)
    endDate.setDate(startOfWeek.getDate() + 6)
    
    const params = {
      dateRange: [startDate, endDate.toISOString().split('T')[0]]
    }
    
    const response = await scheduleApi.getSchedules(params)
    const responseData = response.data
    const rawSchedules = responseData.data?.data || responseData.data || []
    
    // 关联员工信息和时间段信息
    schedules.value = rawSchedules.map(schedule => {
      const employee = employees.value.find(emp => emp.id === schedule.employee_id)
      const timeSlot = timeSlots.value.find(ts => ts.id === schedule.time_slot_id)
      console.log('排班数据关联:', {
        schedule: schedule.id,
        employee_id: schedule.employee_id,
        employee: employee?.name,
        time_slot_id: schedule.time_slot_id,
        timeSlot: timeSlot?.name
      })
      return {
        ...schedule,
        employee,
        timeSlot
      }
    })
    
    console.log('排班数据处理完成:', {
      total: schedules.value.length,
      employees: employees.value.length,
      timeSlots: timeSlots.value.length,
      sample: schedules.value[0]
    })
  } catch (error) {
    console.error('获取排班数据失败:', error)
    schedules.value = []
  } finally {
    loading.value = false
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}


const fetchEmployees = async () => {
  try {
    const response = await employeeApi.getEmployees()
    console.log('员工API响应:', response)
    // 尝试多种数据结构解析
    const responseData = response.data
    employees.value = responseData.data?.data || responseData.data || responseData || []
    console.log('员工数据处理结果:', employees.value)
  } catch (error) {
    console.error('获取员工列表失败:', error)
    employees.value = []
  }
}

const fetchTimeSlots = async () => {
  try {
    const response = await availabilityApi.getTimeSlots()
    console.log('时间段API响应:', response)
    // 尝试多种数据结构解析
    const responseData = response.data
    timeSlots.value = responseData.data?.data || responseData.data || responseData || []
    console.log('时间段数据处理结果:', timeSlots.value)
  } catch (error) {
    console.error('获取时间段数据失败:', error)
    timeSlots.value = []
  }
}


// 监听周变化
watch(currentWeek, async () => {
  await calculateWeekDays()
  await updateWeekRangeText()
  await fetchSchedules()
})

onMounted(async () => {
  await Promise.all([
    fetchEmployees(),
    fetchTimeSlots()
  ])
  await updateCurrentWeekNumber()
  await calculateWeekDays()
  await updateWeekRangeText()
  await updateTodayWeekRangeText()
  await fetchSchedules()
})
</script>

<style lang="scss" scoped>
.employee-dashboard-container {
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;
}

// 移动端优化
@media (max-width: 768px) {
  .employee-dashboard-container {
    padding: 0; // 在移动端移除内边距，让布局组件控制间距
    background: #f8fafc;
  }
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border-radius: 16px;
  color: white;
  
  h1 {
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 16px;
  }
  
  .today-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    
    .last-update {
      opacity: 0.8;
    }
  }
}


.schedule-overview {
  margin-bottom: 24px;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-content {
      h2 {
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
        margin: 0 0 4px 0;
      }
      
      p {
        font-size: 14px;
        color: #718096;
        margin: 0;
      }
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .current-week-info {
        text-align: center;
        padding: 0 12px;
        
        .week-range {
          font-weight: 600;
          color: #4ade80;
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .week-number {
          display: flex;
          justify-content: center;
        }
      }
    }
  }
}

.schedule-calendar {
  margin-top: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  
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
    min-height: 100px;
    
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
      
      .schedule-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .scheduled-employee {
        border-radius: 6px;
        padding: 6px 8px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        &.my-schedule {
          background: #dcfce7;
          border: 2px solid #22c55e;
          
          .employee-name {
            font-weight: 700;
            color: #166534;
          }
          
          .my-badge {
            background: #22c55e;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 12px;
            font-weight: 600;
          }
        }
        
        &.other-schedule {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          
          .employee-name {
            color: #475569;
          }
        }
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .employee-info {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .employee-name {
            font-size: 12px;
            font-weight: 600;
          }
        }
      }
      
      .vacancy-slot {
        background: #fafafa;
        border: 1px dashed #d9d9d9;
        border-radius: 4px;
        padding: 6px;
        text-align: center;
        color: #909399;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
    }
  }
}

.schedule-summary {
  margin-top: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  
  .summary-item {
    text-align: center;
    
    .label {
      display: block;
      font-size: 12px;
      color: #718096;
      margin-bottom: 4px;
    }
    
    .value {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      
      &.success {
        color: #22c55e;
      }
      
      &.primary {
        color: #4ade80;
      }
    }
  }
}

.quick-actions {
  .action-card {
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .action-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px;
    }
    
    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .action-info {
      flex: 1;
      
      .action-title {
        font-size: 16px;
        font-weight: 600;
        color: #1a202c;
        margin-bottom: 2px;
      }
      
      .action-desc {
        font-size: 12px;
        color: #718096;
      }
    }
  }
}

.schedule-detail {
  padding: 10px 0;
}

// 视图切换样式
.desktop-view {
  display: block;
}

.mobile-view {
  display: none;
}

// 手机端排班列表样式
.schedule-list {
  .day-schedule {
    margin-bottom: 20px;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    .day-header {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      &.today {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }
      
      .day-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        .day-name {
          font-size: 16px;
          font-weight: 700;
        }
        
        .day-date {
          font-size: 12px;
          opacity: 0.9;
        }
      }
      
      .day-status {
        text-align: right;
        
        .my-shifts {
          font-size: 13px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.25);
          padding: 4px 8px;
          border-radius: 12px;
          margin-bottom: 4px;
        }
        
        .total-shifts {
          font-size: 11px;
          opacity: 0.8;
        }
      }
    }
    
    .day-time-slots {
      padding: 16px;
      
      .time-slot-card {
        background: #f8fafc;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        border: 1px solid #e2e8f0;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          
          .slot-info {
            .slot-name {
              font-size: 14px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 4px;
            }
            
            .slot-time {
              font-size: 12px;
              color: #718096;
            }
          }
        }
        
        .slot-employees {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          
          .employee-chip {
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
            
            &.my-chip {
              background: #dcfce7;
              color: #166534;
              border: 2px solid #22c55e;
              
              .me-badge {
                background: #22c55e;
                color: white;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
              }
              
              &:hover {
                background: #bbf7d0;
                transform: translateY(-1px);
              }
            }
            
            &.other-chip {
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
              
              &:hover {
                background: #e2e8f0;
                transform: translateY(-1px);
              }
            }
          }
          
          .add-employee-chip {
            background: #f0fdf4;
            color: #4ade80;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            border: 1px dashed #4ade80;
            display: flex;
            align-items: center;
            gap: 4px;
            opacity: 0.7;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .schedule-calendar {
    overflow-x: auto;
    
    .calendar-header,
    .time-row {
      min-width: 800px;
    }
  }
}

// 平板端优化
@media (max-width: 768px) {
  // 切换到手机端视图
  .desktop-view {
    display: none;
  }
  
  .mobile-view {
    display: block;
  }
  
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 20px 16px;
    
    h1 {
      font-size: 24px;
    }
    
    p {
      font-size: 15px;
    }
  }
  
  .schedule-overview {
    margin-bottom: 20px;
    
    .el-card__header {
      padding: 16px;
    }
    
    .el-card__body {
      padding: 16px;
    }
    
    .section-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
      
      .header-content {
        text-align: center;
        
        h2 {
          font-size: 16px;
        }
        
        p {
          font-size: 13px;
        }
      }
      
      .header-actions {
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        
        .current-week-info {
          order: -1;
          width: 100%;
          margin-bottom: 8px;
          
          .week-range {
            font-size: 15px;
            margin-bottom: 6px;
          }
        }
        
        .el-button {
          font-size: 12px;
          padding: 6px 12px;
        }
      }
    }
  }
  
  .schedule-calendar {
    .calendar-header,
    .time-row {
      min-width: 900px; // 增加最小宽度确保内容可读
    }
    
    .calendar-header {
      .time-cell, .day-cell {
        padding: 10px 8px;
        font-size: 12px;
        
        .day-name {
          font-size: 12px;
        }
        
        .day-date {
          font-size: 10px;
        }
      }
    }
    
    .time-row {
      min-height: 100px; // 增加行高
      
      .time-cell {
        padding: 12px 10px;
        min-width: 180px;
        
        .time-name {
          font-size: 12px;
          font-weight: 700;
        }
        
        .time-period {
          font-size: 11px;
        }
        
        .required-people {
          font-size: 10px;
        }
      }
      
      .schedule-cell {
        padding: 8px;
        min-width: 90px;
        
        .schedule-content {
          gap: 3px;
        }
        
        .scheduled-employee {
          padding: 8px 10px;
          min-height: 36px; // 增加最小高度便于点击
          border-radius: 8px;
          
          .employee-info {
            .employee-name {
              font-size: 12px;
              line-height: 1.3;
            }
            
            .my-badge {
              font-size: 9px;
              padding: 2px 5px;
            }
          }
          
          &.my-schedule {
            border-width: 2px;
            
            .employee-name {
              font-weight: 700;
            }
          }
        }
        
        .vacancy-slot {
          padding: 8px 6px;
          font-size: 11px;
          min-height: 32px;
          border-radius: 6px;
          
          span {
            font-size: 10px;
          }
        }
      }
    }
  }
  
  .schedule-summary {
    padding: 16px;
    
    .el-col {
      margin-bottom: 8px;
    }
    
    .summary-item {
      .label {
        font-size: 11px;
      }
      
      .value {
        font-size: 16px;
      }
    }
  }
  
  .quick-actions {
    margin-top: 20px;
    
    .el-col {
      margin-bottom: 12px;
    }
    
    .action-card {
      .action-content {
        padding: 12px;
        gap: 12px;
      }
      
      .action-icon {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
      
      .action-info {
        .action-title {
          font-size: 14px;
        }
        
        .action-desc {
          font-size: 11px;
        }
      }
    }
  }
}

// 手机端进一步优化
@media (max-width: 480px) {
  .employee-dashboard-container {
    padding: 16px;
  }
  
  .welcome-section {
    padding: 18px 16px;
    
    h1 {
      font-size: 22px;
    }
    
    p {
      font-size: 14px;
    }
  }
  
  .schedule-overview {
    margin-bottom: 16px;
    
    .el-card__header {
      padding: 16px 12px;
    }
    
    .el-card__body {
      padding: 12px;
    }
    
    .section-header {
      .header-content {
        h2 {
          font-size: 15px;
        }
        
        p {
          font-size: 12px;
        }
      }
      
      .header-actions {
        flex-direction: column;
        gap: 12px;
        
        .current-week-info {
          .week-range {
            font-size: 16px;
            font-weight: 700;
            color: #4ade80;
            background: #f0fdf4;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
          }
          
          .week-number {
            margin-top: 6px;
          }
        }
        
        .el-button {
          flex: 1;
          max-width: 120px;
        }
      }
    }
  }
  
  .schedule-calendar {
    border-radius: 8px;
    
    .calendar-header,
    .time-row {
      min-width: 1000px; // 进一步增加宽度确保可读性
    }
    
    .calendar-header {
      grid-template-columns: 180px repeat(7, minmax(110px, 1fr));
      
      .time-cell, .day-cell {
        padding: 12px 10px;
        
        .day-name {
          font-size: 12px;
          font-weight: 700;
        }
        
        .day-date {
          font-size: 10px;
          margin-top: 4px;
        }
      }
    }
    
    .time-row {
      grid-template-columns: 180px repeat(7, minmax(110px, 1fr));
      min-height: 110px;
      
      .time-cell {
        min-width: 180px;
        padding: 14px 12px;
        
        .time-name {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 6px;
        }
        
        .time-period {
          font-size: 11px;
          margin-bottom: 3px;
        }
        
        .required-people {
          font-size: 10px;
        }
      }
      
      .schedule-cell {
        min-width: 110px;
        padding: 10px 8px;
        
        .scheduled-employee {
          padding: 10px 12px;
          min-height: 40px;
          border-radius: 8px;
          margin-bottom: 4px;
          
          &:hover {
            transform: none; // 移除hover效果避免触摸问题
          }
          
          .employee-info {
            .employee-name {
              font-size: 13px;
              font-weight: 600;
              line-height: 1.4;
            }
            
            .my-badge {
              font-size: 10px;
              padding: 3px 6px;
              border-radius: 12px;
            }
          }
          
          &.my-schedule {
            border-width: 3px; // 增加边框宽度使"我的排班"更突出
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
          }
        }
        
        .vacancy-slot {
          padding: 10px 8px;
          min-height: 36px;
          font-size: 11px;
          border-radius: 8px;
          
          .el-icon {
            font-size: 14px;
          }
          
          span {
            font-size: 11px;
          }
        }
      }
    }
  }
  
  .schedule-summary {
    margin-top: 16px;
    padding: 16px 12px;
    
    .el-col {
      margin-bottom: 12px;
    }
    
    .summary-item {
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      text-align: center;
      
      .label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        color: #718096;
      }
      
      .value {
        font-size: 18px;
        font-weight: 700;
        color: #1a202c;
        
        &.success {
          color: #22c55e;
        }
        
        &.primary {
          color: #4ade80;
        }
      }
    }
  }
  
  .quick-actions {
    margin-top: 16px;
    
    .el-col {
      margin-bottom: 12px;
    }
    
    .action-card {
      height: 100%;
      
      .action-content {
        flex-direction: column;
        text-align: center;
        gap: 12px;
        padding: 8px;
      }
      
      .action-icon {
        width: 48px;
        height: 48px;
        font-size: 22px;
        border-radius: 12px;
        margin: 0 auto;
      }
      
      .action-info {
        .action-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .action-desc {
          font-size: 12px;
        }
      }
    }
  }
}
</style>