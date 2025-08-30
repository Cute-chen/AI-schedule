<template>
  <div class="employee-referral-container">
    <div class="page-header">
      <div>
        <h1>我的推荐</h1>
        <p>查看您推荐的员工和推荐记录</p>
      </div>
      <el-button 
        type="primary" 
        @click="showInviteDialog = true"
        icon="Share"
        size="large"
      >
        邀请同事加入
      </el-button>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ referralInfo.referredCount || 0 }}</div>
            <div class="stat-label">已推荐人数</div>
          </div>
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ getApprovedCount() }}</div>
            <div class="stat-label">已通过审核</div>
          </div>
          <div class="stat-icon success">
            <el-icon><Check /></el-icon>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ getPendingCount() }}</div>
            <div class="stat-label">审核中</div>
          </div>
          <div class="stat-icon warning">
            <el-icon><Clock /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 推荐信息 -->
    <el-card class="referral-info-card">
      <template #header>
        <div class="card-header">
          <span>推荐详情</span>
          <el-button @click="fetchMyReferrals" :loading="loading" icon="Refresh" circle />
        </div>
      </template>
      
      <div v-loading="loading">
        <!-- 推荐人信息 -->
        <div v-if="referralInfo.referrer" class="referrer-section">
          <h3>推荐人信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="推荐人">{{ referralInfo.referrer.name }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ referralInfo.referrer.email }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 我推荐的员工 -->
        <div class="referred-section">
          <h3>我推荐的员工</h3>
          
          <div v-if="referralInfo.referredEmployees && referralInfo.referredEmployees.length > 0">
            <el-table :data="referralInfo.referredEmployees" style="width: 100%">
              <el-table-column prop="name" label="姓名" width="150" />
              <el-table-column prop="email" label="邮箱" width="200" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.registration_status)">
                    {{ getStatusText(row.registration_status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="账户状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'warning'">
                    {{ row.status === 'active' ? '激活' : '未激活' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="注册时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-tooltip content="查看详情" placement="top">
                    <el-button 
                      type="primary" 
                      size="small" 
                      icon="View"
                      circle
                      @click="showReferredDetail(row)"
                    />
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <div v-else class="empty-state">
            <el-empty 
              description="您还没有推荐过任何员工"
              :image-size="100"
            >
              <el-button 
                type="primary" 
                @click="showInviteDialog = true"
              >
                立即推荐
              </el-button>
            </el-empty>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 邀请对话框 -->
    <el-dialog v-model="showInviteDialog" title="邀请同事加入" width="600px">
      <div class="invite-content">
        <el-alert
          title="邀请说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="invite-help">
              <p><strong>如何邀请同事：</strong></p>
              <ol>
                <li>将下面的注册链接发送给您的同事</li>
                <li>同事访问链接并填写注册信息</li>
                <li>在推荐人邮箱处填写您的邮箱：<strong>{{ userEmail }}</strong></li>
                <li>提交后等待管理员审核</li>
              </ol>
            </div>
          </template>
        </el-alert>
        
        <div class="invite-link-section">
          <label class="invite-label">注册链接：</label>
          <el-input 
            :value="inviteLink" 
            readonly 
            class="invite-input"
          >
            <template #append>
              <el-button @click="copyInviteLink" type="primary">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
            </template>
          </el-input>
        </div>
        
        <div class="invite-email-section">
          <label class="invite-label">您的邮箱（推荐人邮箱）：</label>
          <el-input :value="userEmail" readonly />
          <el-text size="small" type="info">
            同事在注册时需要填写此邮箱作为推荐人
          </el-text>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showInviteDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyInviteLink">
          复制邀请链接
        </el-button>
      </template>
    </el-dialog>

    <!-- 推荐详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="推荐员工详情" width="500px">
      <div v-if="selectedReferred">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="姓名">{{ selectedReferred.name }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedReferred.email }}</el-descriptions-item>
          <el-descriptions-item label="注册状态">
            <el-tag :type="getStatusTagType(selectedReferred.registration_status)">
              {{ getStatusText(selectedReferred.registration_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="账户状态">
            <el-tag :type="selectedReferred.status === 'active' ? 'success' : 'warning'">
              {{ selectedReferred.status === 'active' ? '已激活' : '未激活' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDate(selectedReferred.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Check, Clock, Share, View, CopyDocument, Refresh } from '@element-plus/icons-vue'
import { employeeApi } from '@/services/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const showInviteDialog = ref(false)
const showDetailDialog = ref(false)
const selectedReferred = ref(null)

const referralInfo = ref({
  employee: null,
  referrer: null,
  referredEmployees: [],
  referredCount: 0
})

// 计算属性
const userEmail = computed(() => userStore.userInfo?.email || '')

const inviteLink = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/register`
})

// 获取已通过审核数量
const getApprovedCount = () => {
  if (!referralInfo.value.referredEmployees) return 0
  return referralInfo.value.referredEmployees.filter(emp => emp.registration_status === 'approved').length
}

// 获取审核中数量
const getPendingCount = () => {
  if (!referralInfo.value.referredEmployees) return 0
  return referralInfo.value.referredEmployees.filter(emp => emp.registration_status === 'pending').length
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
      return '审核中'
    case 'rejected':
      return '已拒绝'
    default:
      return '未知'
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取我的推荐信息
const fetchMyReferrals = async () => {
  try {
    loading.value = true
    const response = await employeeApi.getMyReferrals()
    referralInfo.value = response.data || {
      employee: null,
      referrer: null,
      referredEmployees: [],
      referredCount: 0
    }
  } catch (error) {
    console.error('获取推荐信息失败:', error)
    ElMessage.error('获取推荐信息失败')
  } finally {
    loading.value = false
  }
}

// 复制邀请链接
const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    ElMessage.success('邀请链接已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    // 降级处理
    const textArea = document.createElement('textarea')
    textArea.value = inviteLink.value
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('邀请链接已复制到剪贴板')
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制链接')
    }
    document.body.removeChild(textArea)
  }
}

// 显示推荐详情
const showReferredDetail = (referred) => {
  selectedReferred.value = referred
  showDetailDialog.value = true
}

// 初始化
onMounted(() => {
  fetchMyReferrals()
})
</script>

<style lang="scss" scoped>
.employee-referral-container {
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
}

.stats-row {
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
  
  &.success {
    color: #67C23A;
  }
  
  &.warning {
    color: #E6A23C;
  }
}

.referral-info-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.referrer-section, .referred-section {
  margin-bottom: 30px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #303133;
    font-size: 16px;
    font-weight: 600;
  }
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.invite-content {
  .invite-help {
    font-size: 14px;
    line-height: 1.6;
    
    p {
      margin: 0 0 8px 0;
    }
    
    ol {
      margin: 8px 0 0 16px;
      padding: 0;
      
      li {
        margin: 4px 0;
      }
    }
  }
}

.invite-link-section, .invite-email-section {
  margin: 20px 0;
  
  .invite-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #303133;
  }
  
  .invite-input {
    margin-bottom: 8px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .stats-row {
    .el-col {
      margin-bottom: 16px;
    }
  }
}
</style>