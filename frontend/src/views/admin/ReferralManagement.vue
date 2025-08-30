<template>
  <div class="referral-management-container">
    <div class="page-header">
      <div>
        <h1>推荐人员管理</h1>
        <p>管理员工推荐关系，审核自助注册申请</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 推荐统计 -->
      <el-tab-pane label="推荐统计" name="stats">
        <div class="stats-section">
          <el-row :gutter="20" class="stats-cards">
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ referralStats.totalEmployees || 0 }}</div>
                  <div class="stat-label">在职员工</div>
                </div>
                <div class="stat-icon">
                  <el-icon><User /></el-icon>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ referralStats.totalReferrals || 0 }}</div>
                  <div class="stat-label">推荐入职</div>
                </div>
                <div class="stat-icon">
                  <el-icon><Connection /></el-icon>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ pendingCount }}</div>
                  <div class="stat-label">待审核</div>
                </div>
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ getTopReferrerCount() }}</div>
                  <div class="stat-label">最多推荐</div>
                </div>
                <div class="stat-icon">
                  <el-icon><Trophy /></el-icon>
                </div>
              </el-card>
            </el-col>
          </el-row>
          
          <el-card class="referral-table-card">
            <template #header>
              <div class="card-header">
                <span>员工推荐情况</span>
                <el-button @click="fetchReferralStats" :loading="statsLoading" icon="Refresh" circle />
              </div>
            </template>
            
            <el-table 
              :data="referralStats.employees || []" 
              v-loading="statsLoading"
              style="width: 100%"
            >
              <el-table-column prop="name" label="员工姓名" width="150" />
              <el-table-column prop="email" label="邮箱" width="200" />
              <el-table-column prop="referredCount" label="推荐人数" width="100" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.referredCount > 0" type="success">{{ row.referredCount }}</el-tag>
                  <span v-else class="text-muted">0</span>
                </template>
              </el-table-column>
              <el-table-column label="推荐的员工" min-width="300">
                <template #default="{ row }">
                  <div v-if="row.referredEmployees && row.referredEmployees.length > 0" class="referred-list">
                    <el-tag 
                      v-for="referred in row.referredEmployees" 
                      :key="referred.id"
                      :type="getStatusTagType(referred.registration_status)"
                      size="small"
                      style="margin: 2px;"
                    >
                      {{ referred.name }}
                      <span class="status-text">({{ getStatusText(referred.registration_status) }})</span>
                    </el-tag>
                  </div>
                  <span v-else class="text-muted">暂无推荐</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 待审核申请 -->
      <el-tab-pane name="pending">
        <template #label>
          <span>待审核申请</span>
          <el-badge v-if="pendingCount > 0" :value="pendingCount" class="tab-badge" />
        </template>
        
        <div class="pending-section">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>待审核的注册申请</span>
                <el-button @click="fetchPendingRegistrations" :loading="pendingLoading" icon="Refresh" circle />
              </div>
            </template>
            
            <el-table 
              :data="pendingRegistrations" 
              v-loading="pendingLoading"
              style="width: 100%"
            >
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="email" label="邮箱" width="200" />
              <el-table-column prop="phone" label="手机" width="130" />
              <el-table-column label="推荐人" width="150">
                <template #default="{ row }">
                  <div v-if="row.referrer">
                    <div class="referrer-name">{{ row.referrer.name }}</div>
                    <div class="referrer-email">{{ row.referrer.email }}</div>
                  </div>
                  <span v-else class="text-muted">无推荐人</span>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="申请时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button 
                    type="success" 
                    size="small" 
                    @click="approveRegistration(row.id)" 
                    :loading="approvingIds.includes(row.id)"
                  >
                    通过
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="showRejectDialog(row)" 
                    :loading="approvingIds.includes(row.id)"
                  >
                    拒绝
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div v-if="pendingRegistrations.length === 0 && !pendingLoading" class="empty-state">
              <el-empty description="暂无待审核的注册申请" />
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 拒绝申请对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝注册申请" width="500px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="申请人">
          <el-input :value="selectedApplication?.name" disabled />
        </el-form-item>
        <el-form-item label="拒绝原因" required>
          <el-input 
            v-model="rejectForm.reason" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入拒绝原因..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button 
          type="danger" 
          @click="rejectRegistration" 
          :loading="rejectLoading"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Connection, Clock, Trophy, Refresh } from '@element-plus/icons-vue'
import { authAPI, employeeApi } from '@/services/api'

// 响应式数据
const activeTab = ref('stats')
const statsLoading = ref(false)
const pendingLoading = ref(false)
const rejectLoading = ref(false)
const approvingIds = ref([])

const referralStats = ref({
  employees: [],
  totalEmployees: 0,
  totalReferrals: 0
})

const pendingRegistrations = ref([])
const rejectDialogVisible = ref(false)
const selectedApplication = ref(null)

const rejectForm = reactive({
  reason: ''
})

// 计算属性
const pendingCount = computed(() => pendingRegistrations.value.length)

// 获取推荐最多的员工数量
const getTopReferrerCount = () => {
  if (!referralStats.value.employees || referralStats.value.employees.length === 0) {
    return 0
  }
  return Math.max(...referralStats.value.employees.map(emp => emp.referredCount))
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  switch (status) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
      return 'danger'
    default:
      return ''
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'approved':
      return '已通过'
    case 'pending':
      return '待审核'
    case 'rejected':
      return '已拒绝'
    default:
      return '未知'
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 获取推荐统计
const fetchReferralStats = async () => {
  try {
    statsLoading.value = true
    const response = await employeeApi.getReferralStats()
    referralStats.value = response.data || {
      employees: [],
      totalEmployees: 0,
      totalReferrals: 0
    }
  } catch (error) {
    console.error('获取推荐统计失败:', error)
    ElMessage.error('获取推荐统计失败')
  } finally {
    statsLoading.value = false
  }
}

// 获取待审核申请
const fetchPendingRegistrations = async () => {
  try {
    pendingLoading.value = true
    const response = await authAPI.getPendingRegistrations()
    pendingRegistrations.value = response.data?.pendingRegistrations || []
  } catch (error) {
    console.error('获取待审核申请失败:', error)
    ElMessage.error('获取待审核申请失败')
  } finally {
    pendingLoading.value = false
  }
}

// 通过注册申请
const approveRegistration = async (id) => {
  try {
    await ElMessageBox.confirm('确定要通过这个注册申请吗？', '确认操作', {
      type: 'warning'
    })
    
    approvingIds.value.push(id)
    
    const response = await authAPI.approveRegistration(id, { action: 'approve' })
    
    ElMessage.success('注册申请已通过')
    
    // 从列表中移除已通过的申请
    const index = pendingRegistrations.value.findIndex(reg => reg.id === id)
    if (index !== -1) {
      pendingRegistrations.value.splice(index, 1)
    }
    
    // 刷新统计
    fetchReferralStats()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核失败:', error)
      ElMessage.error('审核失败')
    }
  } finally {
    const index = approvingIds.value.indexOf(id)
    if (index !== -1) {
      approvingIds.value.splice(index, 1)
    }
  }
}

// 显示拒绝对话框
const showRejectDialog = (application) => {
  selectedApplication.value = application
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

// 拒绝注册申请
const rejectRegistration = async () => {
  if (!rejectForm.reason.trim()) {
    ElMessage.error('请输入拒绝原因')
    return
  }
  
  try {
    rejectLoading.value = true
    
    const response = await authAPI.approveRegistration(selectedApplication.value.id, { 
      action: 'reject',
      reason: rejectForm.reason
    })
    
    ElMessage.success('注册申请已拒绝')
    
    // 从列表中移除已拒绝的申请
    const index = pendingRegistrations.value.findIndex(reg => reg.id === selectedApplication.value.id)
    if (index !== -1) {
      pendingRegistrations.value.splice(index, 1)
    }
    
    rejectDialogVisible.value = false
    
  } catch (error) {
    console.error('拒绝失败:', error)
    ElMessage.error('拒绝失败')
  } finally {
    rejectLoading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchReferralStats()
  fetchPendingRegistrations()
})
</script>

<style lang="scss" scoped>
.referral-management-container {
  padding: 20px;
}

.page-header {
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
}

.main-tabs {
  .tab-badge {
    margin-left: 8px;
  }
}

.stats-section {
  .stats-cards {
    margin-bottom: 24px;
  }
  
  .stat-card {
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    
    :deep(.el-card__body) {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
  
  .stat-content {
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #409EFF;
      line-height: 1;
      margin-bottom: 8px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #606266;
    }
  }
  
  .stat-icon {
    font-size: 40px;
    color: #E4E7ED;
  }
}

.referral-table-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.referred-list {
  .status-text {
    font-size: 11px;
    opacity: 0.8;
  }
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.pending-section {
  .referrer-name {
    font-weight: 500;
    color: #303133;
  }
  
  .referrer-email {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}

.empty-state {
  padding: 40px;
  text-align: center;
}

// 响应式设计
@media (max-width: 768px) {
  .stats-cards {
    .el-col {
      margin-bottom: 16px;
    }
  }
}
</style>