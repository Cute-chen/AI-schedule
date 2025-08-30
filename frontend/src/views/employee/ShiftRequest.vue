<template>
  <div class="employee-shift-request-container">
    <div class="page-header">
      <h1>我的调班申请</h1>
      <el-button type="primary" @click="handleCreateNewRequest">
        <el-icon><Plus /></el-icon>
        新增申请
      </el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="请求类型">
          <el-select v-model="filterForm.type" placeholder="请选择类型" clearable>
            <el-option label="请假" value="leave" />
            <el-option label="调班" value="swap" />
            <el-option label="加班" value="overtime" />
            <el-option label="换班" value="change" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
            <el-option label="待审核" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card pending">
            <div class="stats-content">
              <div class="stats-number">{{ stats.pending }}</div>
              <div class="stats-label">待审核</div>
            </div>
            <el-icon class="stats-icon"><Clock /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card approved">
            <div class="stats-content">
              <div class="stats-number">{{ stats.approved }}</div>
              <div class="stats-label">已批准</div>
            </div>
            <el-icon class="stats-icon"><Check /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card rejected">
            <div class="stats-content">
              <div class="stats-number">{{ stats.rejected }}</div>
              <div class="stats-label">已拒绝</div>
            </div>
            <el-icon class="stats-icon"><Close /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card total">
            <div class="stats-content">
              <div class="stats-number">{{ stats.total }}</div>
              <div class="stats-label">我的申请总数</div>
            </div>
            <el-icon class="stats-icon"><Document /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-table :data="myShiftRequests" v-loading="loading" border>
      <el-table-column prop="id" label="申请编号" width="100" />
      <el-table-column prop="type" label="请求类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getTypeTagColor(row.type)">
            {{ getTypeText(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="originalDate" label="原班次日期" width="120" />
      <el-table-column label="原班次时间段" width="150">
        <template #default="{ row }">
          <div v-if="row.originalTimeSlot">
            {{ row.originalTimeSlot.name }}<br>
            <small>{{ row.originalTimeSlot.startTime }} - {{ row.originalTimeSlot.endTime }}</small>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="requestedDate" label="请求日期" width="120" />
      <el-table-column label="目标时间段" width="150">
        <template #default="{ row }">
          <div v-if="row.targetTimeSlot">
            {{ row.targetTimeSlot.name }}<br>
            <small>{{ row.targetTimeSlot.startTime }} - {{ row.targetTimeSlot.endTime }}</small>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="目标员工" width="120">
        <template #default="{ row }">
          <span v-if="row.targetEmployee">
            {{ row.targetEmployee.name }}
          </span>
          <span v-else class="no-target">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="申请原因" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagColor(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="urgency" label="紧急程度" width="120">
        <template #default="{ row }">
          <el-rate v-model="row.urgency" disabled show-score />
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="160" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="primary" 
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              size="small" 
              type="danger" 
              @click="handleCancel(row)"
            >
              撤销
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="pagination.current"
      v-model:page-size="pagination.size"
      :page-sizes="[10, 20, 50]"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 新增/编辑请求对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingRequest ? '编辑申请' : '新增调班申请'"
      width="700px"
      :close-on-click-modal="false"
    >
      <!-- 步骤指示器 -->
      <el-steps :active="formStep - 1" finish-status="success" style="margin-bottom: 30px;">
        <el-step title="选择排班" description="选择要调班的时间" />
        <el-step title="选择交换" description="选择交换方式" />
        <el-step title="填写信息" description="完善申请信息" />
      </el-steps>

      <!-- 步骤1：选择排班 -->
      <div v-if="formStep === 1" class="step-content">
        <h3>请选择您要申请调班的排班时间：</h3>
        <div v-if="mySchedules.length === 0" class="no-schedules">
          <el-empty description="暂无可调班的排班" />
        </div>
        <div v-else class="schedules-list">
          <el-row :gutter="15">
            <el-col :span="12" v-for="schedule in mySchedules" :key="schedule.id">
              <el-card 
                class="schedule-card" 
                :class="{ 'selected': selectedSchedule?.id === schedule.id }"
                @click="handleScheduleSelect(schedule)"
                shadow="hover"
              >
                <div class="schedule-info">
                  <div class="schedule-date">{{ schedule.schedule_date }}</div>
                  <div class="schedule-time">{{ schedule.timeSlot?.name }}</div>
                  <div class="schedule-time-range">
                    {{ schedule.timeSlot?.start_time }} - {{ schedule.timeSlot?.end_time }}
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 步骤2：选择交换方式 -->
      <div v-if="formStep === 2" class="step-content">
        <h3>选择交换方式：</h3>
        <div v-if="selectedSchedule" class="selected-schedule-info">
          <el-alert 
            :title="`已选择: ${selectedSchedule.schedule_date} ${selectedSchedule.timeSlot?.name}`"
            type="info" 
            :closable="false" 
            style="margin-bottom: 20px;"
          />
        </div>
        
        <el-radio-group v-model="requestForm.type" style="margin-bottom: 20px;">
          <el-radio label="swap">与其他员工换班</el-radio>
          <el-radio label="cancel">放弃值班</el-radio>
        </el-radio-group>

        <div v-if="requestForm.type === 'swap'">
          <h4>可交换的选项：</h4>
          <div v-if="availableSwaps.length === 0" class="no-swaps">
            <el-empty description="当天暂无其他员工的排班可供交换" />
          </div>
          <div v-else class="swaps-list">
            <el-row :gutter="15">
              <el-col :span="12" v-for="swap in availableSwaps" :key="swap.id">
                <el-card 
                  class="swap-card"
                  :class="{ 'selected': requestForm.targetScheduleId === swap.id }"
                  @click="handleSwapSelect(swap)"
                  shadow="hover"
                >
                  <div class="swap-info">
                    <div class="employee-name">{{ swap.employee.name }}</div>
                    <div class="employee-position">{{ swap.employee.position }}</div>
                    <div class="swap-date">{{ swap.schedule_date }}</div>
                    <div class="swap-time">{{ swap.timeSlot?.name }}</div>
                    <div class="swap-time-range">
                      {{ swap.timeSlot?.start_time }} - {{ swap.timeSlot?.end_time }}
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>

        <div v-if="requestForm.type === 'cancel'" class="cancel-info">
          <el-alert 
            title="放弃值班说明" 
            type="warning" 
            :closable="false"
            style="margin-bottom: 15px;"
          >
            <template #default>
              您选择放弃该值班，系统将尝试重新安排其他员工顶替。请在下一步详细说明放弃原因。
            </template>
          </el-alert>
        </div>
      </div>

      <!-- 步骤3：填写申请信息 -->
      <div v-if="formStep === 3" class="step-content">
        <h3>完善申请信息：</h3>
        <el-form :model="requestForm" :rules="formRules" ref="requestFormRef" label-width="100px">
          <el-form-item label="申请摘要">
            <el-input 
              :value="getRequestSummary()" 
              readonly 
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="紧急程度">
            <el-rate v-model="requestForm.urgency" />
            <span class="urgency-text">{{ getUrgencyText(requestForm.urgency) }}</span>
          </el-form-item>
          <el-form-item label="申请原因" prop="reason">
            <el-input 
              v-model="requestForm.reason" 
              type="textarea" 
              :rows="4" 
              placeholder="请详细说明申请调班的原因..."
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button v-if="formStep > 1" @click="handlePrevStep">上一步</el-button>
          <el-button 
            v-if="formStep < 3" 
            type="primary" 
            @click="handleNextStep"
            :disabled="!canGoNext()"
          >
            下一步
          </el-button>
          <el-button 
            v-if="formStep === 3" 
            type="primary" 
            @click="handleSubmit" 
            :loading="submitting"
          >
            {{ submitting ? '提交中...' : '提交申请' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 请求详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="申请详情"
      width="700px"
    >
      <div v-if="selectedRequest" class="request-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">
            {{ selectedRequest.id }}
          </el-descriptions-item>
          <el-descriptions-item label="请求类型">
            <el-tag :type="getTypeTagColor(selectedRequest.type)">
              {{ getTypeText(selectedRequest.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="原班次日期">
            {{ selectedRequest.originalDate }}
          </el-descriptions-item>
          <el-descriptions-item label="原班次时间段">
            <div v-if="selectedRequest.originalTimeSlot">
              {{ selectedRequest.originalTimeSlot.name }}<br>
              <small>{{ selectedRequest.originalTimeSlot.startTime }} - {{ selectedRequest.originalTimeSlot.endTime }}</small>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="请求日期">
            {{ selectedRequest.requestedDate }}
          </el-descriptions-item>
          <el-descriptions-item label="目标时间段">
            <div v-if="selectedRequest.targetTimeSlot">
              {{ selectedRequest.targetTimeSlot.name }}<br>
              <small>{{ selectedRequest.targetTimeSlot.startTime }} - {{ selectedRequest.targetTimeSlot.endTime }}</small>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="目标员工">
            <span v-if="selectedRequest.targetEmployee">
              {{ selectedRequest.targetEmployee.name }}
              <el-tag size="small" type="info">{{ selectedRequest.targetEmployee.position }}</el-tag>
            </span>
            <span v-else class="no-target">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-rate v-model="selectedRequest.urgency" disabled show-score />
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagColor(selectedRequest.status)">
              {{ getStatusText(selectedRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">
            {{ selectedRequest.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">
            {{ selectedRequest.reason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedRequest.responseNote" label="审核意见" :span="2">
            <div class="response-note">
              {{ selectedRequest.responseNote }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedRequest.reviewedAt" label="审核时间" :span="2">
            {{ selectedRequest.reviewedAt }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Clock, Check, Close, Document } from '@element-plus/icons-vue'
import { shiftRequestApi, employeeApi } from '@/services/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const submitting = ref(false)
const myShiftRequests = ref([])
const employees = ref([])
const mySchedules = ref([])
const availableSwaps = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingRequest = ref(null)
const selectedRequest = ref(null)
const selectedSchedule = ref(null)
const requestFormRef = ref()
const formStep = ref(1)

const filterForm = reactive({
  type: '',
  status: '',
  dateRange: []
})

const requestForm = reactive({
  type: '',
  originalDate: '',
  requestedDate: '',
  urgency: 3,
  reason: '',
  targetEmployeeId: null,
  targetScheduleId: null
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0
})

const formRules = {
  type: [{ required: true, message: '请选择请求类型', trigger: 'change' }],
  originalDate: [{ required: true, message: '请选择原班次日期', trigger: 'change' }],
  requestedDate: [{ required: true, message: '请选择请求日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }]
}

const getTypeText = (type) => {
  const types = {
    leave: '请假',
    swap: '调班',
    overtime: '加班',
    change: '换班',
    cancel: '放弃值班'
  }
  return types[type] || type
}

const getTypeTagColor = (type) => {
  const colors = {
    leave: 'warning',
    swap: 'success',
    overtime: 'danger',
    change: 'info',
    cancel: 'danger'
  }
  return colors[type] || ''
}

const getStatusText = (status) => {
  const statuses = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝'
  }
  return statuses[status] || status
}

const getStatusTagColor = (status) => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return colors[status] || ''
}

const getUrgencyText = (urgency) => {
  const texts = {
    1: '低',
    2: '较低',
    3: '中等',
    4: '较高',
    5: '高'
  }
  return texts[urgency] || ''
}

const canGoNext = () => {
  if (formStep.value === 1) {
    return selectedSchedule.value !== null
  }
  if (formStep.value === 2) {
    return requestForm.type && (requestForm.type === 'cancel' || (requestForm.type === 'swap' && requestForm.targetScheduleId))
  }
  return true
}

const getRequestSummary = () => {
  if (!selectedSchedule.value) return ''
  
  if (requestForm.type === 'cancel') {
    return `申请放弃值班: ${selectedSchedule.value.schedule_date} ${selectedSchedule.value.timeSlot?.name}`
  }
  
  const targetSwap = availableSwaps.value.find(swap => swap.id === requestForm.targetScheduleId)
  const selectedEmployee = targetSwap?.employee
  
  if (requestForm.type === 'swap' && selectedEmployee && targetSwap) {
    return `将 ${selectedSchedule.value.schedule_date} ${selectedSchedule.value.timeSlot?.name} 与 ${selectedEmployee.name} 的 ${targetSwap.schedule_date} ${targetSwap.timeSlot?.name} 进行交换`
  }
  
  return `申请调班: ${selectedSchedule.value.schedule_date} ${selectedSchedule.value.timeSlot?.name}`
}

const fetchMyShiftRequests = async () => {
  loading.value = true
  try {
    const response = await shiftRequestApi.getMyShiftRequests({
      page: pagination.current,
      size: pagination.size,
      ...filterForm
    })
    myShiftRequests.value = response.data?.data || []
    pagination.total = response.data?.total || 0
    
    // 计算统计数据
    const pending = myShiftRequests.value.filter(r => r.status === 'pending').length
    const approved = myShiftRequests.value.filter(r => r.status === 'approved').length
    const rejected = myShiftRequests.value.filter(r => r.status === 'rejected').length
    
    Object.assign(stats, {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected
    })
  } catch (error) {
    ElMessage.error('获取申请记录失败')
  } finally {
    loading.value = false
  }
}

const fetchEmployees = async () => {
  try {
    console.log('开始获取员工列表，当前用户:', userStore.userInfo)
    const response = await employeeApi.getEmployees()
    console.log('员工API响应:', response)
    
    if (response.success !== false) {
      const allEmployees = response.data?.data || []
      employees.value = allEmployees.filter(emp => emp.id !== userStore.userInfo?.id)
      console.log('员工视图员工列表加载成功:', employees.value.length, '个员工 (排除自己)')
    } else {
      console.error('获取员工列表失败 - 接口返回失败:', response)
      ElMessage.error(response.message || '获取员工列表失败')
    }
  } catch (error) {
    console.error('获取员工列表失败 - 网络错误:', error)
    ElMessage.error('获取员工列表失败: ' + (error.message || '网络错误'))
  }
}

const fetchMySchedules = async () => {
  try {
    console.log('获取我的排班列表，用户:', userStore.userInfo?.name)
    
    const response = await shiftRequestApi.getMySchedules()
    
    if (response.success !== false) {
      mySchedules.value = response.data || []
      console.log('我的排班列表加载成功:', mySchedules.value.length, '个排班')
    } else {
      console.error('获取排班列表失败:', response)
      ElMessage.error('获取排班列表失败')
    }
  } catch (error) {
    console.error('获取排班列表失败:', error)
    ElMessage.error('获取排班列表失败: ' + (error.message || '网络错误'))
  }
}

const fetchAvailableSwaps = async (scheduleId) => {
  try {
    const response = await shiftRequestApi.getAvailableSwaps(scheduleId)
    if (response.success !== false) {
      availableSwaps.value = response.data?.availableSwaps || []
      console.log('可交换选项加载成功:', availableSwaps.value.length, '个选项')
    } else {
      console.error('获取可交换选项失败:', response)
      ElMessage.error('获取可交换选项失败')
    }
  } catch (error) {
    console.error('获取可交换选项失败:', error)
    ElMessage.error('获取可交换选项失败: ' + (error.message || '网络错误'))
  }
}

const validateSwap = async (data) => {
  try {
    const response = await shiftRequestApi.validateSwap(data)
    return response.success !== false
  } catch (error) {
    console.error('验证交换失败:', error)
    return false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchMyShiftRequests()
}

const resetFilter = () => {
  Object.assign(filterForm, {
    type: '',
    status: '',
    dateRange: []
  })
  pagination.current = 1
  fetchMyShiftRequests()
}

const handleView = (row) => {
  selectedRequest.value = row
  showDetailDialog.value = true
}

const handleEdit = (row) => {
  editingRequest.value = row
  Object.assign(requestForm, {
    type: row.type,
    originalDate: row.originalDate,
    requestedDate: row.requestedDate,
    urgency: row.urgency,
    reason: row.reason,
    targetEmployeeId: row.targetEmployeeId || ''
  })
  showCreateDialog.value = true
}

const handleCancel = async (row) => {
  try {
    await ElMessageBox.confirm('确定要撤销该申请吗？撤销后无法恢复。', '确认撤销', {
      confirmButtonText: '确定撤销',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await shiftRequestApi.cancelRequest(row.id)
    ElMessage.success('申请已撤销')
    fetchMyShiftRequests()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤销失败')
    }
  }
}

const handleSubmit = async () => {
  try {
    if (formStep.value === 3) {
      await requestFormRef.value.validate()
    }
    
    submitting.value = true
    
    const submitData = {
      ...requestForm,
      employeeId: userStore.userInfo?.id,
      originalScheduleId: selectedSchedule.value?.id,
      requestedDate: selectedSchedule.value?.schedule_date
    }
    
    console.log('提交调班申请数据:', submitData)
    
    if (editingRequest.value) {
      await shiftRequestApi.updateRequest(editingRequest.value.id, submitData)
      ElMessage.success('申请更新成功')
    } else {
      await shiftRequestApi.createRequest(submitData)
      ElMessage.success('调班申请提交成功，请等待审核')
    }
    
    showCreateDialog.value = false
    resetForm()
    fetchMyShiftRequests()
  } catch (error) {
    console.error('提交申请失败:', error)
    if (error?.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  Object.assign(requestForm, {
    type: '',
    originalDate: '',
    requestedDate: '',
    urgency: 3,
    reason: '',
    targetEmployeeId: null,
    targetScheduleId: null
  })
  editingRequest.value = null
  selectedSchedule.value = null
  availableSwaps.value = []
  formStep.value = 1
  requestFormRef.value?.clearValidate()
}

const handleSwapSelect = (swap) => {
  requestForm.targetScheduleId = swap.id
  requestForm.targetEmployeeId = swap.employee.id
  console.log('选择交换选项:', {
    scheduleId: swap.id,
    employeeName: swap.employee.name,
    date: swap.schedule_date,
    timeSlot: swap.timeSlot?.name
  })
}

const handleScheduleSelect = async (schedule) => {
  selectedSchedule.value = schedule
  requestForm.originalDate = schedule.schedule_date
  requestForm.type = '' // 清空类型，让用户自主选择
  requestForm.targetEmployeeId = null // 清空目标员工，设置为null而不是空字符串
  requestForm.targetScheduleId = null // 清空目标排班，设置为null而不是空字符串
  
  // 获取可交换的选项
  await fetchAvailableSwaps(schedule.id)
  formStep.value = 2
}

const handleNextStep = () => {
  if (formStep.value === 1 && selectedSchedule.value) {
    formStep.value = 2
  } else if (formStep.value === 2) {
    formStep.value = 3
  }
}

const handlePrevStep = () => {
  if (formStep.value > 1) {
    formStep.value--
  }
}

const handleCreateNewRequest = () => {
  resetForm()
  fetchMySchedules()
  showCreateDialog.value = true
}

const handleSizeChange = (newSize) => {
  pagination.size = newSize
  fetchMyShiftRequests()
}

const handleCurrentChange = (newCurrent) => {
  pagination.current = newCurrent
  fetchMyShiftRequests()
}

onMounted(() => {
  fetchMyShiftRequests()
  fetchEmployees()
  fetchMySchedules()
})
</script>

<style scoped>
.employee-shift-request-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  color: #333;
  font-size: 24px;
  margin: 0;
}

.filter-bar {
  background: #f5f5f5;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stats-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.2s;
}

.stats-card:hover {
  transform: translateY(-2px);
}

.stats-content {
  position: relative;
  z-index: 2;
}

.stats-number {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.stats-icon {
  position: absolute;
  right: 15px;
  top: 15px;
  font-size: 40px;
  opacity: 0.3;
}

.stats-card.pending .stats-number { color: #fa8c16; }
.stats-card.approved .stats-number { color: #52c41a; }
.stats-card.rejected .stats-number { color: #ff4d4f; }
.stats-card.total .stats-number { color: #1890ff; }

.el-pagination {
  margin-top: 20px;
  text-align: right;
}

.request-detail {
  padding: 20px 0;
}

.urgency-text {
  margin-left: 10px;
  font-size: 14px;
  color: #666;
}

.response-note {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
  font-style: italic;
}

.el-table {
  margin-bottom: 20px;
}

.el-table .el-table__cell {
  padding: 12px 0;
}

/* 分步骤表单样式 */
.step-content {
  min-height: 300px;
  padding: 20px 0;
}

.step-content h3 {
  margin-bottom: 20px;
  color: #333;
  font-weight: 600;
}

.step-content h4 {
  margin: 15px 0 10px 0;
  color: #666;
  font-weight: 500;
}

/* 排班卡片样式 */
.schedule-card, .swap-card {
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 15px;
}

.schedule-card:hover, .swap-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.schedule-card.selected, .swap-card.selected {
  border: 2px solid #409eff;
  background-color: #f0f9ff;
}

.schedule-info, .swap-info {
  text-align: center;
  padding: 10px;
}

.schedule-date, .employee-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.schedule-time, .swap-time {
  font-size: 14px;
  color: #409eff;
  margin-bottom: 3px;
}

.schedule-time-range, .swap-time-range {
  font-size: 12px;
  color: #999;
}

.employee-position {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.swap-date {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 3px;
}

.no-schedules, .no-swaps {
  text-align: center;
  padding: 40px 20px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-schedule-info {
  margin-bottom: 20px;
}

.cancel-info {
  margin-bottom: 20px;
}

/* 按钮布局优化 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-wrap: nowrap;
}

/* 目标员工显示样式 */
.no-target {
  color: #c0c4cc;
  font-style: italic;
}
</style>