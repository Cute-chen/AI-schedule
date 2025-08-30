<template>
  <div class="dashboard-container">
    <!-- 欢迎头部 -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h1>👋 欢迎，{{ userStore.username }}！</h1>
        <p>今天是 {{ formatDate(new Date()) }}，{{ getTimeGreeting() }}</p>
      </div>
      <div class="today-info">
        <el-tag type="info" size="large">{{ currentWeekDisplay }}</el-tag>
        <div class="last-update">
          <el-text type="info" size="small">
            数据更新: {{ lastUpdateTime }}
          </el-text>
        </div>
      </div>
    </div>

    <!-- 本周值班表 -->
    <div class="schedule-overview-section">
      <div class="section-header">
        <div class="header-content">
          <h2>📅 本周值班表</h2>
          <p>快速查看和管理本周排班安排</p>
        </div>
        <div class="header-actions">
          <el-button size="small" @click="goToPreviousWeek">
            <el-icon><ArrowLeft /></el-icon>
            上周
          </el-button>
          <span class="current-week-text">{{ scheduleWeekDisplay }}</span>
          <el-button size="small" @click="goToNextWeek">
            下周
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button type="primary" size="small" @click="$router.push('/admin/schedules')">
            管理排班
          </el-button>
        </div>
      </div>
      
      <!-- 值班表格区域 -->
      <div class="schedule-table-container" v-loading="scheduleTableData.loading">
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
            v-for="timeSlot in scheduleTableData.timeSlots" 
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
                  @click="showScheduleDetails(schedule)"
                >
                  <div class="employee-info">
                    <span class="employee-name">{{ schedule.employee?.name }}</span>
                  </div>
                </div>

                <!-- 空缺提示 -->
                <div 
                  v-if="getNeedMorePeople(timeSlot.id, day.date) > 0"
                  class="vacancy-slot"
                  @click="handleAssignEmployee(timeSlot.id, day.date)"
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
                {{ getSchedulesForDay(day.date).length }} / {{ scheduleTableData.timeSlots.reduce((sum, slot) => sum + slot.requiredPeople, 0) }} 人
              </div>
            </div>
            
            <div class="day-time-slots">
              <div 
                v-for="timeSlot in scheduleTableData.timeSlots" 
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
                    @click="showScheduleDetails(schedule)"
                  >
                    {{ schedule.employee?.name }}
                  </div>
                  
                  <div 
                    v-if="getNeedMorePeople(timeSlot.id, day.date) > 0"
                    class="add-employee-chip"
                    @click="handleAssignEmployee(timeSlot.id, day.date)"
                  >
                    <el-icon><Plus /></el-icon>
                    <span>+{{ getNeedMorePeople(timeSlot.id, day.date) }}</span>
                  </div>
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
              <span class="label">空缺</span>
              <span class="value warning">{{ weekScheduleStats.vacant }}</span>
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
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-row :gutter="32">
        <!-- 数据统计概览 -->
        <el-col :xs="24" :lg="16">
          <div class="overview-section">
            <div class="section-header">
              <div class="header-content">
                <h2>📊 数据概览</h2>
                <p>核心业务数据实时统计与趋势分析</p>
              </div>
              <div class="header-actions">
                <el-button 
                  type="primary" 
                  size="small" 
                  :icon="Refresh"
                  @click="refreshData"
                  :loading="loading"
                >
                  刷新数据
                </el-button>
                
              </div>
            </div>
            
            <!-- 核心指标卡片 -->
            <div class="core-metrics">
              <div class="metric-card" v-loading="loading">
                <div class="metric-header">
                  <div class="metric-icon employee">
                    <el-icon><User /></el-icon>
                  </div>
                  <div class="metric-label">员工总数</div>
                </div>
                <div class="metric-value">{{ stats.totalEmployees || 0 }}</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-icon availability">
                    <el-icon><Clock /></el-icon>
                  </div>
                  <div class="metric-label">空闲时间</div>
                </div>
                <div class="metric-value">{{ stats.availabilityCount || 0 }}</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-icon schedule">
                    <el-icon><Calendar /></el-icon>
                  </div>
                  <div class="metric-label">排班总数</div>
                </div>
                <div class="metric-value">{{ stats.assignedShifts || 0 }}</div>
              </div>
              
              <div class="metric-card" :class="{ 'urgent': stats.pendingRequests > 0 }">
                <div class="metric-header">
                  <div class="metric-icon request">
                    <el-icon><Switch /></el-icon>
                    <el-badge 
                      v-if="stats.pendingRequests > 0" 
                      :value="stats.pendingRequests" 
                      class="metric-badge"
                    />
                  </div>
                  <div class="metric-label">待处理申请</div>
                </div>
                <div class="metric-value">{{ stats.pendingRequests || 0 }}</div>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 右侧栅栏 -->
        <el-col :xs="24" :lg="8">
          <!-- 系统状态卡片 -->
          <div class="status-card">
            <div class="card-header">
              <div class="card-title">
                <el-icon><Connection /></el-icon>
                <span>系统状态</span>
              </div>
              <div class="status-indicator" :class="getOverallStatus()">
                <div class="indicator-dot"></div>
              </div>
            </div>
            
            <div class="status-grid">
              <div class="status-service">
                <div class="service-icon" :class="aiStatus.connected ? 'online' : 'offline'">
                  <el-icon><Cpu /></el-icon>
                </div>
                <div class="service-info">
                  <div class="service-name">AI服务</div>
                  <div class="service-status">{{ aiStatus.text }}</div>
                </div>
                <el-button 
                  v-if="!aiStatus.connected"
                  text 
                  type="primary" 
                  size="small"
                  @click="$router.push('/admin/settings')"
                >
                  配置
                </el-button>
              </div>
              
              <div class="status-service">
                <div class="service-icon" :class="emailStatus.connected ? 'online' : 'offline'">
                  <el-icon><Message /></el-icon>
                </div>
                <div class="service-info">
                  <div class="service-name">邮件服务</div>
                  <div class="service-status">{{ emailStatus.text }}</div>
                </div>
                <el-button 
                  v-if="!emailStatus.connected"
                  text 
                  type="primary" 
                  size="small"
                  @click="$router.push('/admin/settings')"
                >
                  配置
                </el-button>
              </div>
              
              <div class="status-service">
                <div class="service-icon" :class="dbStatus.connected ? 'online' : 'offline'">
                  <el-icon><Connection /></el-icon>
                </div>
                <div class="service-info">
                  <div class="service-name">数据库</div>
                  <div class="service-status">{{ dbStatus.text }}</div>
                </div>
              </div>
            </div>
          </div>
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
        <el-button type="primary" @click="goToScheduleManagement">
          管理排班
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { 
  User, Clock, Cpu, Switch, Message, Connection, Upload, Download,
  Calendar, TrendCharts, Refresh, ArrowDown, ArrowLeft, ArrowRight, Plus, Warning
} from '@element-plus/icons-vue'
import { scheduleApi, employeeApi, availabilityApi, shiftRequestApi, settingsApi } from '@/services/api'
import { settingsService } from '@/utils/settingsService'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const lastUpdateTime = ref('未更新')
const currentWeekDisplay = ref('加载中...')
const scheduleWeekDisplay = ref('加载中...')
const stats = reactive({
  totalEmployees: 0,
  assignedShifts: 0,
  availabilityCount: 0,
  pendingRequests: 0,
  // 新增统计数据
  todayShifts: 0,
  thisWeekTotal: 0,
  completedShifts: 0,
  activeEmployees: 0,
  upcomingShifts: 0,
  recentRequests: 0,
  totalRequests: 0 // 新增总申请数
})

const aiStatus = reactive({
  connected: false,
  text: '未配置',
  color: '#909399'
})

const emailStatus = reactive({
  connected: false, 
  text: '未配置',
  color: '#909399'
})

const dbStatus = reactive({
  connected: true,
  text: '连接正常',
  color: '#67c23a'
})

const activeTab = ref('schedule') // 控制详细统计面板的当前标签

// 值班表相关数据
const scheduleTableData = reactive({
  currentWeek: new Date(),
  currentWeekStartDate: null, // 添加当前周的开始日期
  weekSchedules: [],
  timeSlots: [],
  loading: false
})

const showDetailDialog = ref(false)
const selectedSchedule = ref(null)

// 计算属性
const getOverallStatus = () => {
  const allConnected = aiStatus.connected && emailStatus.connected && dbStatus.connected
  if (allConnected) return 'online'
  
  const someConnected = aiStatus.connected || emailStatus.connected || dbStatus.connected
  if (someConnected) return 'warning'
  
  return 'offline'
}

// 工具函数
const getStartOfWeek = async (date) => {
  try {
    return await settingsService.calculateWeekStart(date)
  } catch (error) {
    console.error('计算周开始日期失败:', error)
    // 回退到传统计算
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

const formatWeekRange = async (date) => {
  try {
    const start = await getStartOfWeek(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `第${await getWeekNumber(date)}周`
  } catch (error) {
    console.error('格式化周范围失败:', error)
    return `第${await getWeekNumber(date)}周`
  }
}

const formatDayDate = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

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

const getTimeGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
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

// 值班表相关计算属性
const weekDays = computed(() => {
  const days = []
  // 使用响应式的 currentWeekStartDate，如果为空则返回空数组
  if (!scheduleTableData.currentWeekStartDate) {
    return days
  }
  
  const startOfWeek = scheduleTableData.currentWeekStartDate
  
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

const weekScheduleStats = computed(() => {
  const total = scheduleTableData.timeSlots.reduce((sum, slot) => sum + (slot.requiredPeople * 7), 0)
  const assigned = scheduleTableData.weekSchedules.length
  const vacant = Math.max(0, total - assigned)
  
  return {
    total,
    assigned,
    vacant,
    completionRate: total > 0 ? Math.round((assigned / total) * 100) : 0
  }
})

// 获取指定时间段和日期的排班
const getSchedulesForSlot = (timeSlotId, date) => {
  const dateStr = date.toISOString().split('T')[0]
  return scheduleTableData.weekSchedules.filter(
    s => s.time_slot_id === timeSlotId && s.schedule_date === dateStr
  )
}

// 获取指定日期的所有排班
const getSchedulesForDay = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  return scheduleTableData.weekSchedules.filter(
    s => s.schedule_date === dateStr
  )
}

// 获取需要补充的人数
const getNeedMorePeople = (timeSlotId, date) => {
  const slot = scheduleTableData.timeSlots.find(s => s.id === timeSlotId)
  if (!slot) return 0
  const assigned = getSchedulesForSlot(timeSlotId, date).length
  return slot.requiredPeople - assigned
}

// 更新当前周开始日期的异步函数
const updateCurrentWeekStartDate = async () => {
  try {
    const startDate = await getStartOfWeek(scheduleTableData.currentWeek)
    scheduleTableData.currentWeekStartDate = startDate
  } catch (error) {
    console.error('更新周开始日期失败:', error)
    // 回退到传统计算方法
    const d = new Date(scheduleTableData.currentWeek)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    scheduleTableData.currentWeekStartDate = new Date(d.setDate(diff))
  }
}

// 周导航方法
const goToPreviousWeek = async () => {
  const newDate = new Date(scheduleTableData.currentWeek)
  newDate.setDate(newDate.getDate() - 7)
  scheduleTableData.currentWeek = newDate
  await updateCurrentWeekStartDate()
  fetchWeekSchedules()
  updateScheduleWeekDisplay()
}

const goToNextWeek = async () => {
  const newDate = new Date(scheduleTableData.currentWeek)
  newDate.setDate(newDate.getDate() + 7)
  scheduleTableData.currentWeek = newDate
  await updateCurrentWeekStartDate()
  fetchWeekSchedules()
  updateScheduleWeekDisplay()
}

// 显示排班详情
const showScheduleDetails = (schedule) => {
  selectedSchedule.value = schedule
  showDetailDialog.value = true
}

// 处理分配员工
const handleAssignEmployee = (timeSlotId, date) => {
  router.push('/admin/schedules')
}

// 跳转到排班管理
const goToScheduleManagement = () => {
  showDetailDialog.value = false
  router.push('/admin/schedules')
}

// 更新周次显示
const updateCurrentWeekDisplay = async () => {
  try {
    currentWeekDisplay.value = await formatWeekRange(new Date())
  } catch (error) {
    console.error('Failed to update current week display:', error)
    currentWeekDisplay.value = '显示错误'
  }
}

const updateScheduleWeekDisplay = async () => {
  try {
    scheduleWeekDisplay.value = await formatWeekRange(scheduleTableData.currentWeek)
  } catch (error) {
    console.error('Failed to update schedule week display:', error)
    scheduleWeekDisplay.value = '显示错误'
  }
}

// 事件处理
const importData = () => {
  router.push('/availability')
}

const generateSchedule = () => {
  if (stats.availabilityCount === 0) {
    ElMessage.warning('请先录入员工空闲时间')
    return
  }
  router.push('/schedules')
}

const exportSchedule = async () => {
  try {
    // 检查是否有排班数据
    if (stats.assignedShifts === 0) {
      ElMessage.warning('暂无排班数据可导出')
      return
    }
    
    // 获取本周排班数据
    const startOfWeek = await getStartOfWeek(new Date())
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
    const response = await scheduleApi.getSchedules({ 
      startDate: startOfWeekStr,
      format: 'excel' 
    })
    
    // 处理文件下载
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `排班表_${startOfWeekStr}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('排班表导出成功')
  } catch (error) {
    console.error('导出排班表失败:', error)
    ElMessage.error('导出失败，请稍后再试')
  }
}

const handleExport = (command) => {
  if (command === 'summary') {
    ElMessage.info('导出汇总报告功能待实现')
  } else if (command === 'detailed') {
    exportSchedule()
  }
}

const refreshData = async () => {
  // 更新当前周开始日期
  await updateCurrentWeekStartDate()
  
  // 并行刷新所有数据
  await Promise.all([
    fetchDashboardData(),
    checkSystemStatus(),
    fetchWeekSchedules(),
    updateCurrentWeekDisplay(),
    updateScheduleWeekDisplay()
  ])
}

// 值班表数据获取
const fetchWeekSchedules = async () => {
  try {
    scheduleTableData.loading = true
    
    // 确保 currentWeekStartDate 已设置
    if (!scheduleTableData.currentWeekStartDate) {
      await updateCurrentWeekStartDate()
    }
    
    const startDate = scheduleTableData.currentWeekStartDate.toISOString().split('T')[0]
    const endDate = new Date(scheduleTableData.currentWeekStartDate)
    endDate.setDate(endDate.getDate() + 6)
    
    const params = {
      dateRange: [startDate, endDate.toISOString().split('T')[0]]
    }
    
    const response = await scheduleApi.getSchedules(params)
    const responseData = response.data
    scheduleTableData.weekSchedules = Array.isArray(responseData.data) ? responseData.data : (Array.isArray(responseData) ? responseData : [])
    
    console.log('值班表数据加载成功:', scheduleTableData.weekSchedules.length, '个排班')
  } catch (error) {
    console.error('获取值班表数据失败:', error)
    scheduleTableData.weekSchedules = []
  } finally {
    scheduleTableData.loading = false
  }
}

const fetchScheduleTimeSlots = async () => {
  try {
    const response = await availabilityApi.getTimeSlots()
    scheduleTableData.timeSlots = Array.isArray(response.data) ? response.data : []
    console.log('时间段数据加载成功:', scheduleTableData.timeSlots.length, '个时间段')
  } catch (error) {
    console.error('获取时间段失败:', error)
    scheduleTableData.timeSlots = []
  }
}

// 数据获取
const fetchDashboardData = async () => {
  try {
    loading.value = true
    
    // 获取本周开始日期
    const currentWeekStart = await getStartOfWeek(new Date())
    const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0]
    
    // 并行获取所有数据
    const [employees, schedules, availabilities, requests] = await Promise.allSettled([
      employeeApi.getEmployees(),
      scheduleApi.getSchedules({ 
        startDate: currentWeekStartStr 
      }),
      availabilityApi.getAvailabilities({}),
      shiftRequestApi.getShiftRequests({ status: 'pending' })
    ])
    
    // 更新统计数据
    if (employees.status === 'fulfilled') {
      const employeeData = employees.value.data?.data || employees.value.data || []
      stats.totalEmployees = Array.isArray(employeeData) ? employeeData.length : 0
      // 计算活跃员工（有空闲时间记录的员工）
      if (availabilities.status === 'fulfilled') {
        const availabilityData = availabilities.value.data?.data || availabilities.value.data || []
        const activeEmployeeIds = new Set(availabilityData.map(a => a.employeeId || a.employee_id).filter(id => id))
        stats.activeEmployees = activeEmployeeIds.size
      }
      console.log('员工数据:', employeeData, '总数:', stats.totalEmployees, '活跃:', stats.activeEmployees)
    }
    
    if (schedules.status === 'fulfilled') {
      const scheduleData = schedules.value.data?.data || schedules.value.data || []
      stats.assignedShifts = Array.isArray(scheduleData) ? scheduleData.length : 0
      
      // 分析排班数据
      if (scheduleData.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const now = new Date()
        
        stats.todayShifts = scheduleData.filter(s => {
          const scheduleDate = s.date || s.schedule_date || s.shiftDate
          return scheduleDate && scheduleDate.split('T')[0] === today
        }).length
        
        stats.completedShifts = scheduleData.filter(s => {
          const scheduleDate = new Date(s.date || s.schedule_date || s.shiftDate)
          const endTime = s.endTime || s.end_time || '18:00'
          const scheduleEnd = new Date(scheduleDate.toISOString().split('T')[0] + 'T' + endTime)
          return scheduleEnd < now
        }).length
        
        stats.upcomingShifts = stats.assignedShifts - stats.completedShifts
      }
      
      console.log('排班数据:', scheduleData, '总数:', stats.assignedShifts, '今日:', stats.todayShifts)
    }
    
    if (availabilities.status === 'fulfilled') {
      const availabilityData = availabilities.value.data?.data || availabilities.value.data || []
      stats.availabilityCount = Array.isArray(availabilityData) ? availabilityData.length : 0
      
      // 计算本周可用时段
      if (availabilityData.length > 0) {
        const endOfWeek = new Date(currentWeekStart)
        endOfWeek.setDate(currentWeekStart.getDate() + 6)
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0]
        
        stats.thisWeekTotal = availabilityData.filter(a => {
          const availDate = a.date || a.available_date
          return availDate && availDate >= currentWeekStartStr && availDate <= endOfWeekStr
        }).length
      }
      
      console.log('空闲数据:', availabilityData, '总数:', stats.availabilityCount, '本周:', stats.thisWeekTotal)
    }
    
    if (requests.status === 'fulfilled') {
      const requestData = requests.value.data?.data || requests.value.data || []
      stats.pendingRequests = Array.isArray(requestData) ? requestData.length : 0
      stats.totalRequests = requestData.length // 更新总申请数
      
      // 计算最近的申请（24小时内）
      if (requestData.length > 0) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        stats.recentRequests = requestData.filter(r => {
          const requestDate = new Date(r.createdAt || r.created_at || r.requestDate)
          return requestDate > oneDayAgo
        }).length
      }
      
      console.log('申请数据:', requestData, '待处理:', stats.pendingRequests, '最近:', stats.recentRequests)
    }
    
  } catch (error) {
    console.error('获取Dashboard数据失败:', error)
  } finally {
    loading.value = false
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 检查系统状态
const checkSystemStatus = async () => {
  try {
    // 调用真实的系统健康检查API
    const healthResponse = await settingsApi.getSystemHealth()
    const healthData = healthResponse.data || {}
    
    // 更新AI服务状态
    const aiHealth = healthData.ai || {}
    aiStatus.connected = !!aiHealth.connected
    aiStatus.text = aiHealth.text || (aiHealth.connected ? '已配置' : '未配置')
    aiStatus.color = aiHealth.connected ? '#67c23a' : '#909399'
    
    // 更新邮件服务状态
    const emailHealth = healthData.email || {}
    emailStatus.connected = !!emailHealth.connected
    emailStatus.text = emailHealth.text || (emailHealth.connected ? '已配置' : '未配置')
    emailStatus.color = emailHealth.connected ? '#67c23a' : '#909399'
    
    // 更新数据库连接状态
    const dbHealth = healthData.database || {}
    dbStatus.connected = !!dbHealth.connected
    dbStatus.text = dbHealth.text || (dbHealth.connected ? '连接正常' : '连接异常')
    dbStatus.color = dbHealth.connected ? '#67c23a' : '#f56c6c'
    
  } catch (error) {
    console.error('检查系统状态失败:', error)
    
    // 如果健康检查API调用失败，说明可能是网络或服务器问题
    aiStatus.connected = false
    aiStatus.text = '检查失败'
    aiStatus.color = '#f56c6c'
    
    emailStatus.connected = false
    emailStatus.text = '检查失败'
    emailStatus.color = '#f56c6c'
    
    dbStatus.connected = false
    dbStatus.text = '检查失败'
    dbStatus.color = '#f56c6c'
  }
}

onMounted(async () => {
  // 初始化当前周开始日期
  await updateCurrentWeekStartDate()
  
  // 并行执行其他初始化任务
  await Promise.all([
    fetchDashboardData(),
    checkSystemStatus(),
    fetchScheduleTimeSlots(),
    fetchWeekSchedules(),
    updateCurrentWeekDisplay(),
    updateScheduleWeekDisplay()
  ])
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;
}

// 移动端优化
@media (max-width: 768px) {
  .dashboard-container {
    padding: 0; // 在移动端移除内边距，让布局组件控制间距
    background: #f8fafc;
  }
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

// 主要内容区域样式
.main-content {
  margin-top: 0;
}

// 数据概览区域
.overview-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    
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
      gap: 10px;
    }
  }
  
  .core-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
    
    .metric-card {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
      }
      
      &.urgent {
        border-color: #f56565;
        animation: pulse 2s infinite;
      }
      
      .metric-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        
        .metric-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          background: linear-gradient(135deg, #667eea, #764ba2);
          position: relative;
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
          
          &.employee {
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
          
          &.availability {
            background: linear-gradient(135deg, #48bb78, #38a169);
          }
          
          &.schedule {
            background: linear-gradient(135deg, #ed8936, #dd6b20);
          }
          
          &.request {
            background: linear-gradient(135deg, #f56565, #e53e3e);
          }
          
          .metric-badge {
            position: absolute;
            top: -6px;
            right: -6px;
          }
        }
        
        .metric-label {
          font-size: 16px;
          color: #374151;
          font-weight: 600;
          margin-top: 4px;
        }
      }
      
      .metric-value {
        font-size: 40px;
        font-weight: 800;
        color: #1a202c;
        margin-bottom: 0;
        line-height: 1;
      }
      
      .metric-subtitle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #718096;
        
        .subtitle-text {
          font-weight: 600;
        }
        
        .subtitle-divider {
          color: #d1d5db;
        }
      }
    }
  }
  
  .simple-stats {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      
      .stats-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        transition: all 0.3s ease;
        
        &:hover {
          background: #edf2f7;
          transform: translateY(-1px);
        }
        
        .item-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .item-value {
          font-size: 18px;
          font-weight: 700;
          
          &.primary {
            color: #667eea;
          }
          
          &.success {
            color: #48bb78;
          }
          
          &.info {
            color: #3b82f6;
          }
          
          &.warning {
            color: #ed8936;
          }
        }
      }
    }
  }
  
  .detailed-stats {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    
    .stats-tabs {
      .el-tabs__header {
        margin-bottom: 20px;
      }
      
      .el-tabs__content {
        padding: 0;
      }
    }
    
    .stats-panel {
      .stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      
      .stats-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 12px;
        background: #f8fafc;
        border-radius: 8px;
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 8px;
          
          .item-label {
            font-size: 12px;
            color: #6b7280;
            margin-right: 8px;
          }
          
          .el-tag {
            font-size: 12px;
          }
        }
        
        .item-progress {
          width: 100%;
          margin-bottom: 8px;
          
          .el-progress {
            .el-progress-bar__outer {
              border-radius: 8px;
              background-color: #e2e8f0;
            }
            .el-progress-bar__inner {
              border-radius: 8px;
              transition: width 0.3s ease;
            }
          }
        }
      }
      
      .stats-chart {
        margin-top: 20px;
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .week-distribution {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 100px;
          gap: 10px;
          
          .day-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 50px;
            
            .day-name {
              font-size: 10px;
              color: #718096;
              margin-bottom: 4px;
            }
            
            .day-shifts {
              font-size: 14px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 4px;
            }
            
            .day-bar {
              width: 100%;
              background-color: #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
              transition: height 0.3s ease;
            }
            
            &.today {
              .day-name {
                color: #667eea;
                font-weight: 600;
              }
              .day-shifts {
                color: #667eea;
              }
              .day-bar {
                background: linear-gradient(135deg, #667eea, #764ba2);
              }
            }
            
            &.has-shifts {
              .day-bar {
                background: linear-gradient(135deg, #48bb78, #38a169);
              }
            }
          }
        }
      }
      
      .employee-distribution {
        margin-top: 20px;
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        
        .distribution-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .distribution-chart {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 200px;
          
          .pie-chart {
            position: relative;
            width: 120px;
            height: 120px;
            margin-bottom: 20px;
            
            .pie-segment {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              transition: all 0.5s ease-in-out;
              
              &.active {
                background: conic-gradient(from 0deg, #667eea 0deg, #667eea calc(var(--percentage) * 3.6deg), transparent calc(var(--percentage) * 3.6deg));
              }
              
              &.inactive {
                background: conic-gradient(from calc(var(--percentage) * 3.6deg), #cbd5e0 calc(var(--percentage) * 3.6deg), #cbd5e0 360deg);
              }
            }
          }
          
          .distribution-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            
            .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: #718096;
              
              .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                
                &.active {
                  background: #667eea;
                }
                
                &.inactive {
                  background: #cbd5e0;
                }
              }
            }
          }
        }
      }
      
      .trend-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
        
        .trend-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          
          .trend-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
            background: linear-gradient(135deg, #48bb78, #38a169);
            margin-bottom: 12px;
          }
          
          .trend-content {
            .trend-title {
              font-size: 12px;
              color: #718096;
              margin-bottom: 4px;
            }
            
            .trend-value {
              font-size: 24px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 4px;
            }
            
            .trend-description {
              font-size: 10px;
              color: #9ca3af;
            }
          }
          
          &.positive {
            .trend-icon {
              background: linear-gradient(135deg, #667eea, #764ba2);
            }
          }
          
          &.stable {
            .trend-icon {
              background: linear-gradient(135deg, #48bb78, #38a169);
            }
          }
          
          &.warning {
            .trend-icon {
              background: linear-gradient(135deg, #ed8936, #dd6b20);
            }
          }
        }
      }
      
      .trend-chart {
        margin-top: 20px;
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .trend-lines {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 100px;
          gap: 10px;
          
          .trend-line {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
            min-width: 50px;
            
            .line-label {
              font-size: 10px;
              color: #718096;
              margin-bottom: 4px;
            }
            
            .line-path {
              width: 100%;
              height: 100%;
              background: #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
              position: relative;
              
              &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: var(--progress, 0%);
                height: 100%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 4px;
                transition: width 0.3s ease;
              }
            }
          }
        }
      }
    }
  }
}

// 右侧栈栏样式
.status-card, .actions-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1a202c;
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      position: relative;
      
      .indicator-dot {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      
      &.online .indicator-dot {
        background: #48bb78;
      }
      
      &.warning .indicator-dot {
        background: #ed8936;
      }
      
      &.offline .indicator-dot {
        background: #f56565;
      }
    }
  }
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .status-service {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
    transition: all 0.3s ease;
    
    &:hover {
      background: #edf2f7;
    }
    
    .service-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      
      &.online {
        background: linear-gradient(135deg, #48bb78, #38a169);
        color: white;
      }
      
      &.offline {
        background: #cbd5e0;
        color: #a0aec0;
      }
    }
    
    .service-info {
      flex: 1;
      
      .service-name {
        font-size: 14px;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 2px;
      }
      
      .service-status {
        font-size: 12px;
        color: #718096;
      }
    }
  }
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  
  .action-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
        transform: none;
        box-shadow: none;
      }
    }
    
    &:not(.disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    &.primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
    }
    
    &.warning {
      background: linear-gradient(135deg, #f093fb, #f5576c);
      color: white;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
      }
    }
    
    &.info {
      background: linear-gradient(135deg, #4facfe, #00f2fe);
      color: white;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
      }
    }
    
    .action-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .action-title {
      font-size: 12px;
      font-weight: 600;
    }
  }
}

// 动画效果
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .main-content {
    .el-row {
      flex-direction: column-reverse;
    }
    
    .overview-section {
      padding: 24px;
      
      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        
        .header-actions {
          width: 100%;
          justify-content: flex-start;
        }
      }
    }
    
    .core-metrics {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .simple-stats {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
    }
    
    .status-card, .actions-card {
      padding: 20px;
    }
  }
}

@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 20px;
    
    h1 {
      font-size: 24px;
    }
  }
  
  .overview-section {
    padding: 20px;
    
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      
      .header-content {
        h2 {
          font-size: 20px;
        }
        p {
          font-size: 14px;
        }
      }
      
      .header-actions {
        width: 100%;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 8px;
      }
    }
    
    .core-metrics {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 20px;
      
      .metric-card {
        padding: 16px;
        
        .metric-header {
          .metric-icon {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }
          .metric-label {
            font-size: 13px;
          }
        }
        
        .metric-value {
          font-size: 28px;
        }
        
        .metric-subtitle {
          font-size: 11px;
          gap: 6px;
          
          .subtitle-text {
            font-size: 11px;
          }
          .subtitle-divider {
            font-size: 11px;
          }
        }
        

      }
    }
    
    .simple-stats {
      padding: 16px;
      
      .stats-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
    gap: 12px;
    
    .action-button {
      flex-direction: row;
      justify-content: flex-start;
      gap: 12px;
      padding: 12px;
      
      .action-icon {
        width: 32px;
        height: 32px;
      }
    }
  }
}

// 值班表相关样式
.schedule-overview-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 20px;
  border: 1px solid #e2e8f0;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    
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
      
      .current-week-text {
        font-weight: 600;
        color: #667eea;
        padding: 0 12px;
        font-size: 14px;
      }
    }
  }
}

.schedule-table-container {
  margin-bottom: 20px;
}

.schedule-calendar {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  
  .calendar-header {
    display: grid;
    grid-template-columns: 160px repeat(7, 1fr);
    background: #f8f9fa;
    border-bottom: 2px solid #e4e7ed;
    
    .time-cell, .day-cell {
      padding: 10px 8px;
      border-right: 1px solid #e4e7ed;
      font-weight: 600;
      text-align: center;
      font-size: 13px;
    }
    
    .day-cell {
      &.today {
        background: #e6f4ff;
        color: #1890ff;
      }
      
      .day-name {
        font-size: 13px;
      }
      
      .day-date {
        font-size: 11px;
        margin-top: 2px;
        opacity: 0.8;
      }
    }
  }
  
  .time-row {
    display: grid;
    grid-template-columns: 160px repeat(7, 1fr);
    min-height: 80px;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e4e7ed;
    }
    
    .time-cell {
      padding: 12px 8px;
      border-right: 1px solid #e4e7ed;
      background: #fafafa;
      
      .time-name {
        font-weight: 600;
        color: #303133;
        font-size: 12px;
      }
      
      .time-period {
        font-size: 11px;
        color: #606266;
        margin-top: 2px;
      }
      
      .required-people {
        font-size: 10px;
        color: #909399;
        margin-top: 2px;
      }
    }
    
    .schedule-cell {
      padding: 6px;
      border-right: 1px solid #e4e7ed;
      
      .schedule-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      
      .scheduled-employee {
        background: #e6f4ff;
        border: 1px solid #b3d8ff;
        border-radius: 4px;
        padding: 4px 6px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          background: #d6ebff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .employee-info {
          .employee-name {
            font-weight: 600;
            font-size: 11px;
            color: #303133;
          }
        }
      }
      
      .vacancy-slot {
        background: #fafafa;
        border: 1px dashed #d9d9d9;
        border-radius: 4px;
        padding: 4px 6px;
        text-align: center;
        cursor: pointer;
        color: #909399;
        font-size: 10px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        
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
        padding: 3px 5px;
        text-align: center;
        color: #d4380d;
        font-size: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
    }
  }
}

.schedule-summary {
  margin-top: 16px;
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
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
      
      &.success {
        color: #48bb78;
      }
      
      &.warning {
        color: #ed8936;
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      &.today {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
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
        font-size: 14px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.2);
        padding: 6px 12px;
        border-radius: 16px;
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
            background: #e6f4ff;
            color: #1890ff;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #b3d8ff;
            cursor: pointer;
            transition: all 0.2s;
            
            &:hover {
              background: #d6ebff;
              transform: translateY(-1px);
            }
          }
          
          .add-employee-chip {
            background: #f0f9ff;
            color: #667eea;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            border: 1px dashed #667eea;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
            
            &:hover {
              background: #e0e7ff;
              border-style: solid;
            }
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
      min-width: 700px;
    }
  }
  
  .schedule-overview-section {
    .section-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
      
      .header-actions {
        justify-content: center;
        flex-wrap: wrap;
      }
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
  
  .schedule-overview-section {
    margin: 20px 16px;
    padding: 20px 16px;
    
    .section-header {
      .header-content {
        h2 {
          font-size: 16px;
        }
        
        p {
          font-size: 13px;
        }
      }
      
      .header-actions {
        gap: 8px;
        
        .el-button {
          font-size: 12px;
          padding: 6px 12px;
        }
        
        .current-week-text {
          font-size: 13px;
          padding: 0 8px;
        }
      }
    }
  }
  
  .schedule-calendar {
    .calendar-header,
    .time-row {
      min-width: 800px; // 增加最小宽度确保内容可读
    }
    
    .calendar-header {
      .time-cell, .day-cell {
        padding: 8px 6px;
        font-size: 12px;
        
        .day-date {
          font-size: 10px;
        }
      }
    }
    
    .time-row {
      min-height: 90px; // 增加行高
      
      .time-cell {
        padding: 10px 8px;
        min-width: 140px;
        
        .time-name {
          font-size: 11px;
        }
        
        .time-period {
          font-size: 10px;
        }
        
        .required-people {
          font-size: 9px;
        }
      }
      
      .schedule-cell {
        padding: 6px;
        min-width: 80px;
        
        .schedule-content {
          gap: 2px;
        }
        
        .scheduled-employee {
          padding: 6px 8px;
          min-height: 32px; // 增加最小高度便于点击
          
          .employee-info {
            .employee-name {
              font-size: 11px;
              line-height: 1.2;
            }
          }
        }
        
        .vacancy-slot {
          padding: 6px 4px;
          font-size: 10px;
          min-height: 28px;
          
          span {
            font-size: 9px;
          }
        }
        
        .overstaff-warning {
          padding: 4px 6px;
          font-size: 9px;
          
          span {
            font-size: 8px;
          }
        }
      }
    }
  }
  
  .schedule-summary {
    padding: 12px;
    
    .el-col {
      margin-bottom: 8px;
    }
    
    .summary-item {
      .label {
        font-size: 11px;
      }
      
      .value {
        font-size: 14px;
      }
    }
  }
}

// 手机端进一步优化
@media (max-width: 480px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .welcome-section {
    padding: 20px 16px;
    
    h1 {
      font-size: 22px;
    }
    
    p {
      font-size: 14px;
    }
  }
  
  .schedule-overview-section {
    margin: 16px 0;
    padding: 16px 12px;
    
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
        
        .current-week-text {
          order: -1;
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
          background: #f0f4ff;
          padding: 8px 16px;
          border-radius: 20px;
          margin: 0;
        }
        
        .el-button {
          flex: 1;
          max-width: 120px;
        }
      }
    }
  }
  
  .schedule-calendar {
    border-radius: 6px;
    
    .calendar-header,
    .time-row {
      min-width: 900px; // 进一步增加宽度
    }
    
    .calendar-header {
      grid-template-columns: 160px repeat(7, minmax(100px, 1fr));
      
      .time-cell, .day-cell {
        padding: 10px 8px;
        
        .day-name {
          font-size: 11px;
          font-weight: 700;
        }
        
        .day-date {
          font-size: 9px;
          margin-top: 3px;
        }
      }
    }
    
    .time-row {
      grid-template-columns: 160px repeat(7, minmax(100px, 1fr));
      min-height: 100px;
      
      .time-cell {
        min-width: 160px;
        padding: 12px 10px;
        
        .time-name {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 4px;
        }
        
        .time-period {
          font-size: 10px;
          margin-bottom: 2px;
        }
        
        .required-people {
          font-size: 9px;
        }
      }
      
      .schedule-cell {
        min-width: 100px;
        padding: 8px;
        
        .scheduled-employee {
          padding: 8px 10px;
          min-height: 36px;
          border-radius: 8px;
          margin-bottom: 3px;
          
          &:hover {
            transform: none; // 移除hover效果避免触摸问题
          }
          
          .employee-info {
            .employee-name {
              font-size: 12px;
              font-weight: 600;
              line-height: 1.3;
            }
          }
        }
        
        .vacancy-slot {
          padding: 8px 6px;
          min-height: 32px;
          font-size: 10px;
          border-radius: 6px;
          
          .el-icon {
            font-size: 12px;
          }
          
          span {
            font-size: 10px;
          }
        }
        
        .overstaff-warning {
          padding: 6px 8px;
          font-size: 10px;
          border-radius: 6px;
          
          .el-icon {
            font-size: 10px;
          }
          
          span {
            font-size: 9px;
          }
        }
      }
    }
  }
  
  .schedule-summary {
    margin-top: 16px;
    padding: 16px;
    
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
        font-size: 16px;
        font-weight: 700;
        color: #1a202c;
        
        &.success {
          color: #48bb78;
        }
        
        &.warning {
          color: #ed8936;
        }
      }
    }
  }
}
</style>