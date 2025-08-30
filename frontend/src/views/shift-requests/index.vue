<template>
  <div class="shift-requests-container">
    <div class="page-header">
      <h1>班次请求管理</h1>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable style="width: 140px;">
            <el-option label="待审核" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请人">
          <el-select v-model="filterForm.employeeId" placeholder="请选择员工" clearable style="width: 160px;">
            <el-option
              v-for="employee in employees"
              :key="employee.id"
              :label="employee.name"
              :value="employee.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请日期">
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
              <div class="stats-label">总计</div>
            </div>
            <el-icon class="stats-icon"><Document /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-table :data="shiftRequests" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="employee.name" label="申请人" width="100" />
      <el-table-column label="调班对象" width="100">
        <template #default="{ row }">
          <span v-if="row.targetEmployee">
            {{ row.targetEmployee.name }}
          </span>
          <span v-else class="text-gray">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="请求类型" width="100">
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
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleView(row)">查看</el-button>
          <el-button 
            v-if="row.status === 'pending'"
            size="small" 
            type="success" 
            @click="handleApprove(row)"
          >
            批准
          </el-button>
          <el-button 
            v-if="row.status === 'pending'"
            size="small" 
            type="danger" 
            @click="handleReject(row)"
          >
            拒绝
          </el-button>
          <el-button 
            size="small" 
            type="danger" 
            plain
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="pagination.current"
      v-model:page-size="pagination.size"
      :page-sizes="[10, 20, 50, 100]"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />


    <!-- 请求详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="请求详情"
      width="700px"
    >
      <div v-if="selectedRequest" class="request-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="请求ID">
            {{ selectedRequest.id }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ selectedRequest.employee?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="调班对象" v-if="selectedRequest.targetEmployee">
            <div>
              <strong>{{ selectedRequest.targetEmployee.name }}</strong>
              <br>
              <small class="text-gray">{{ selectedRequest.targetEmployee.position }}</small>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="调班对象" v-else>
            <span class="text-gray">无指定对象</span>
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
          <el-descriptions-item v-if="selectedRequest.responseNote" label="审核备注" :span="2">
            {{ selectedRequest.responseNote }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedRequest.status === 'pending'" class="action-section">
          <h3>审核操作</h3>
          <el-form :model="reviewForm" label-width="80px">
            <el-form-item label="审核备注">
              <el-input v-model="reviewForm.note" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="handleApproveInDetail">批准</el-button>
              <el-button type="danger" @click="handleRejectInDetail">拒绝</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Check, Close, Document } from '@element-plus/icons-vue'
import { shiftRequestApi, employeeApi } from '@/services/api'

const loading = ref(false)
const shiftRequests = ref([])
const employees = ref([])
const showDetailDialog = ref(false)
const selectedRequest = ref(null)

const filterForm = reactive({
  status: '',
  employeeId: '',
  dateRange: []
})

const reviewForm = reactive({
  note: ''
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

const fetchShiftRequests = async () => {
  loading.value = true
  try {
    const response = await shiftRequestApi.getShiftRequests({
      page: pagination.current,
      size: pagination.size,
      ...filterForm
    })
    shiftRequests.value = response.data?.data || []
    pagination.total = response.data?.total || 0
  } catch (error) {
    ElMessage.error('获取班次请求列表失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await shiftRequestApi.getStats()
    Object.assign(stats, response.data || {})
  } catch (error) {
    // 静默处理统计数据获取失败
  }
}

const fetchEmployees = async () => {
  try {
    console.log('开始获取员工列表...')
    const response = await employeeApi.getEmployees({ size: 1000 }) // 获取所有员工，不分页
    console.log('员工API响应:', response)
    
    if (response.success && response.data) {
      employees.value = Array.isArray(response.data) ? response.data : []
      console.log('管理员视图员工列表加载成功:', employees.value.length, '个员工')
    } else {
      console.error('获取员工列表失败 - 接口返回:', response)
      employees.value = []
      ElMessage.error(response.message || '获取员工列表失败')
    }
    
    if (employees.value.length === 0) {
      console.warn('员工列表为空，请检查后端数据')
    }
  } catch (error) {
    console.error('获取员工列表失败 - 网络错误:', error)
    employees.value = []
    ElMessage.error('获取员工列表失败: ' + (error.message || '网络错误'))
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchShiftRequests()
}

const resetFilter = () => {
  Object.assign(filterForm, {
    status: '',
    employeeId: '',
    dateRange: []
  })
  pagination.current = 1
  fetchShiftRequests()
}

const handleView = (row) => {
  selectedRequest.value = row
  reviewForm.note = ''
  showDetailDialog.value = true
}


const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm('确定要批准该请求吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await shiftRequestApi.approveRequest(row.id, { note: '批准' })
    ElMessage.success('批准成功')
    fetchShiftRequests()
    fetchStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批准失败')
    }
  }
}

const handleReject = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝请求', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因'
    })
    
    await shiftRequestApi.rejectRequest(row.id, { note: value })
    ElMessage.success('已拒绝请求')
    fetchShiftRequests()
    fetchStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleApproveInDetail = async () => {
  try {
    await shiftRequestApi.approveRequest(selectedRequest.value.id, { note: reviewForm.note })
    ElMessage.success('批准成功')
    showDetailDialog.value = false
    fetchShiftRequests()
    fetchStats()
  } catch (error) {
    ElMessage.error('批准失败')
  }
}

const handleRejectInDetail = async () => {
  try {
    if (!reviewForm.note.trim()) {
      ElMessage.warning('请输入拒绝原因')
      return
    }
    
    await shiftRequestApi.rejectRequest(selectedRequest.value.id, { note: reviewForm.note })
    ElMessage.success('已拒绝请求')
    showDetailDialog.value = false
    fetchShiftRequests()
    fetchStats()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (row) => {
  try {
    const statusText = {
      pending: '待审核',
      approved: '已批准',
      rejected: '已拒绝',
      cancelled: '已撤销'
    }
    
    const warningText = row.status === 'approved' 
      ? `确定要删除编号 ${row.id} 的调班申请吗？\n注意：该申请已经批准并生效，删除后将无法恢复！` 
      : `确定要删除编号 ${row.id} 的${statusText[row.status] || ''}调班申请吗？删除后将无法恢复。`
    
    await ElMessageBox.confirm(
      warningText, 
      '删除确认', 
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
        dangerouslyUseHTMLString: false
      }
    )
    
    await shiftRequestApi.deleteRequest(row.id)
    ElMessage.success('删除成功')
    fetchShiftRequests()
    fetchStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const handleSizeChange = (newSize) => {
  pagination.size = newSize
  fetchShiftRequests()
}

const handleCurrentChange = (newCurrent) => {
  pagination.current = newCurrent
  fetchShiftRequests()
}

onMounted(() => {
  fetchShiftRequests()
  fetchEmployees()
  fetchStats()
})
</script>

<style scoped>
.shift-requests-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.action-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.action-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.urgency-text {
  margin-left: 10px;
  font-size: 14px;
  color: #666;
}

.text-gray {
  color: #999;
  font-style: italic;
}
</style>