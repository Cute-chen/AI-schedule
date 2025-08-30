<template>
  <div class="employees-container">
    <div class="page-header">
      <div>
        <h1>员工管理</h1>
        <p>管理员工基本信息，添加新员工或更新现有员工状态</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true" size="large">
        <el-icon><Plus /></el-icon>
        添加员工
      </el-button>
    </div>

    <!-- 简化的搜索栏 -->
    <el-card class="search-card">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索员工姓名或邮箱..."
        clearable
        @input="handleSearch"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </el-card>

    <!-- 员工卡片列表 -->
    <div class="employees-grid" v-loading="loading">
      <el-card 
        v-for="employee in filteredEmployees" 
        :key="employee.id" 
        class="employee-card"
        :class="{ 'inactive': employee.status !== 'active' }"
      >
        <div class="employee-info">
          <div class="employee-header">
            <div class="employee-avatar">
              <el-avatar :size="50" :src="employee.avatar">
                {{ employee.name?.charAt(0) || '?' }}
              </el-avatar>
            </div>
            <div class="employee-details">
              <h3 class="employee-name">{{ employee.name }}</h3>
              <p class="employee-email">{{ employee.email }}</p>
              <p class="employee-phone" v-if="employee.phone">{{ employee.phone }}</p>
              <p class="employee-position" v-if="employee.role">
                角色：{{ employee.role === 'admin' ? '管理员' : '员工' }}
              </p>
            </div>
            <div class="employee-status">
              <el-tag 
                :type="employee.status === 'active' ? 'success' : 'warning'" 
                size="large"
              >
                {{ employee.status === 'active' ? '在职' : '停用' }}
              </el-tag>
            </div>
          </div>
        </div>
        
        <div class="employee-actions">
          <!-- 主要操作 -->
          <div class="action-group primary-actions">
            <el-button 
              size="small" 
              type="primary"
              :icon="Edit"
              @click="handleEdit(employee)"
              :disabled="employee.status !== 'active'"
              class="action-btn"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              :type="employee.status === 'active' ? 'warning' : 'success'"
              :icon="employee.status === 'active' ? 'Pause' : 'VideoPlay'"
              @click="toggleEmployeeStatus(employee)"
              :disabled="isCurrentUser(employee) && employee.status === 'active'"
              class="action-btn"
              :title="isCurrentUser(employee) && employee.status === 'active' ? '不能停用自己的账户' : ''"
            >
              {{ employee.status === 'active' ? '停用' : '启用' }}
            </el-button>
          </div>
          
          <!-- 次要操作 -->
          <div class="action-group secondary-actions">
            <el-button 
              size="small" 
              type="warning" 
              plain
              :icon="Delete"
              @click="showDeleteAvailabilityDialog(employee)"
              :disabled="employee.status !== 'active'"
              class="action-btn secondary-btn"
              title="批量删除空闲时间"
            >
              批删时间
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              plain
              :icon="Delete"
              @click="handleDelete(employee)"
              :disabled="employee.status !== 'inactive'"
              class="action-btn danger-btn"
              title="删除员工"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-card>
      
      <!-- 空状态 -->
      <div v-if="filteredEmployees.length === 0" class="empty-state">
        <el-empty description="暂无员工数据">
          <el-button type="primary" @click="showCreateDialog = true">
            添加第一个员工
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 简化的新增/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingEmployee ? '编辑员工信息' : '添加新员工'"
      width="500px"
    >
      <el-form 
        :model="employeeForm" 
        :rules="formRules" 
        ref="employeeFormRef" 
        label-width="80px"
        label-position="top"
      >
        <el-form-item label="员工姓名" prop="name">
          <el-input 
            v-model="employeeForm.name" 
            placeholder="请输入员工姓名"
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="邮箱地址" prop="email">
          <el-input 
            v-model="employeeForm.email" 
            type="email"
            placeholder="用于接收排班通知"
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="初始密码" prop="password" v-if="!editingEmployee">
          <el-input 
            v-model="employeeForm.password" 
            type="password"
            placeholder="请输入初始密码（至少6位）"
            size="large"
            show-password
          />
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            如果不填写，系统将自动设置为默认密码：123456
          </div>
        </el-form-item>
        
        <el-form-item label="手机号码" prop="phone">
          <el-input 
            v-model="employeeForm.phone" 
            placeholder="请输入手机号码"
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="角色 *" prop="role">
          <el-select 
            v-model="employeeForm.role" 
            placeholder="请选择员工角色"
            size="large"
            style="width: 100%"
          >
            <el-option label="普通员工" value="employee" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" prop="status" v-if="editingEmployee">
          <el-radio-group v-model="employeeForm.status">
            <el-radio-button label="active">在职</el-radio-button>
            <el-radio-button label="inactive">停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCancel" size="large">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
          size="large"
        >
          {{ editingEmployee ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量删除员工空闲时间对话框 -->
    <el-dialog v-model="showBatchDeleteAvailabilityDialog" title="批量删除员工空闲时间" width="700px">
      <div class="batch-delete-dialog-content">
        <el-alert
          title="批量删除员工空闲时间说明"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="batch-delete-help">
              <p><strong>功能说明：</strong></p>
              <ul>
                <li>删除指定员工在某些周次的所有空闲时间记录</li>
                <li>支持删除单个周次或周次范围</li>
              </ul>
              
              <p><strong>输入格式：</strong></p>
              <ul>
                <li><strong>单个周次：</strong>1（删除第1周，即当前周）</li>
                <li><strong>多个周次：</strong>1,3,5（删除第1、3、5周）</li>
                <li><strong>周次范围：</strong>2-6（删除第2周到第6周）</li>
                <li><strong>过去的周：</strong>-1,-2（删除前1周、前2周）</li>
                <li><strong>混合输入：</strong>1,3-5,7（删除第1、3-5、7周）</li>
              </ul>
            </div>
          </template>
        </el-alert>

        <el-form :model="deleteAvailabilityForm" style="margin-top: 20px;">
          <el-form-item label="目标员工">
            <el-input :value="selectedEmployee?.name" disabled />
          </el-form-item>

          <el-form-item label="目标周次" required>
            <el-input
              v-model="deleteAvailabilityForm.targetWeeksText"
              type="textarea"
              :rows="3"
              placeholder="请输入要删除的周次，如：1,2-4,6"
              @input="parseDeleteAvailabilityWeeksText"
            />
            <div class="quick-select-buttons">
              <el-button size="small" @click="setQuickDeleteAvailabilityWeeks('1')">当前周</el-button>
              <el-button size="small" @click="setQuickDeleteAvailabilityWeeks('1-4')">前4周</el-button>
              <el-button size="small" @click="setQuickDeleteAvailabilityWeeks('1-8')">前8周</el-button>
              <el-button size="small" @click="clearDeleteAvailabilityForm">清空</el-button>
            </div>
          </el-form-item>

          <el-form-item v-if="deleteAvailabilityForm.targetAbsoluteWeeks.length > 0">
            <template #label>
              <span>将要删除的周次 ({{ deleteAvailabilityForm.targetAbsoluteWeeks.length }}个周次)</span>
            </template>
            <el-tag 
              v-for="week in deleteAvailabilityForm.targetAbsoluteWeeks" 
              :key="week" 
              style="margin: 2px;"
              type="danger"
            >
              {{ week < 0 ? `前${Math.abs(week)}周` : week === 1 ? '当前周' : `第${week}周` }}
            </el-tag>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showBatchDeleteAvailabilityDialog = false">取消</el-button>
        <el-button 
          type="danger" 
          @click="executeDeleteEmployeeAvailability"
          :loading="deleteAvailabilityExecuting"
          :disabled="!deleteAvailabilityForm.targetAbsoluteWeeks.length"
        >
          确认删除空闲时间
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { employeeApi, availabilityApi } from '@/services/api'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const employees = ref([])
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const editingEmployee = ref(null)
const showBatchDeleteAvailabilityDialog = ref(false)
const selectedEmployee = ref(null)
const deleteAvailabilityExecuting = ref(false)

// 员工表单
const employeeForm = reactive({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'employee',
  status: 'active'
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入员工姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { 
      validator: (rule, value, callback) => {
        if (!editingEmployee.value && !value) {
          // 新增员工时，如果没有输入密码，给出提示但不阻止提交
          // 后端会自动使用默认密码123456
          callback()
        } else if (value && value.length < 6) {
          callback(new Error('密码长度不能少于6位'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择员工角色', trigger: 'change' }
  ]
}

const employeeFormRef = ref()

// 批量删除空闲时间表单
const deleteAvailabilityForm = reactive({
  targetWeeks: [], // 存储偏移量供后端使用
  targetAbsoluteWeeks: [], // 存储显示用的周次描述
  targetWeeksText: ''
})

// 过滤后的员工列表
const filteredEmployees = computed(() => {
  if (!searchKeyword.value) return employees.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return employees.value.filter(emp => 
    emp.name?.toLowerCase().includes(keyword) || 
    emp.email?.toLowerCase().includes(keyword)
  )
})

// 检查是否是当前用户
const isCurrentUser = (employee) => {
  return userStore.userInfo && employee.id === userStore.userInfo.id
}

// 搜索功能
const handleSearch = () => {
  // 实时搜索，无需额外处理
}

// 获取员工列表
const fetchEmployees = async () => {
  try {
    loading.value = true
    const response = await employeeApi.getEmployees({ size: 1000 }) // 获取所有员工
    // 处理后端返回的数据格式
    employees.value = response.data || []
    console.log('员工管理页面加载成功:', employees.value.length, '个员工')
  } catch (error) {
    console.error('获取员工列表失败:', error)
    ElMessage.error('获取员工列表失败')
    employees.value = []
  } finally {
    loading.value = false
  }
}

// 编辑员工
const handleEdit = (employee) => {
  editingEmployee.value = employee
  Object.assign(employeeForm, {
    name: employee.name,
    email: employee.email,
    password: '', // 编辑时不显示密码
    phone: employee.phone || '',
    role: employee.role || 'employee',
    status: employee.status
  })
  showCreateDialog.value = true
}

// 切换员工状态
const toggleEmployeeStatus = async (employee) => {
  // 检查是否尝试停用自己的账户
  if (isCurrentUser(employee) && employee.status === 'active') {
    ElMessage.warning('不能停用自己的账户')
    return
  }
  
  const newStatus = employee.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '停用'
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}员工"${employee.name}"吗？`,
      `${action}员工`,
      { type: 'warning' }
    )
    
    await employeeApi.updateEmployee(employee.id, { status: newStatus })
    employee.status = newStatus
    ElMessage.success(`员工已${action}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新员工状态失败:', error)
      ElMessage.error(`${action}失败`)
    }
  }
}

// 查看员工空闲时间
const viewAvailability = (employee) => {
  router.push(`/availability?employee=${employee.id}`)
}

// 删除员工
const handleDelete = async (employee) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除员工“${employee.name}”吗？\n此操作不可撤销！`,
      '删除员工',
      { 
        type: 'error',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )
    
    await employeeApi.deleteEmployee(employee.id)
    // 从列表中移除该员工
    const index = employees.value.findIndex(emp => emp.id === employee.id)
    if (index !== -1) {
      employees.value.splice(index, 1)
    }
    ElMessage.success('员工已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除员工失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await employeeFormRef.value?.validate()
    submitting.value = true
    
    if (editingEmployee.value) {
      // 更新员工
      await employeeApi.updateEmployee(editingEmployee.value.id, employeeForm)
      Object.assign(editingEmployee.value, employeeForm)
      ElMessage.success('员工信息已更新')
    } else {
      // 新增员工
      const response = await employeeApi.createEmployee(employeeForm)
      employees.value.unshift(response.data)
      ElMessage.success('员工添加成功')
    }
    
    handleCancel()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 取消操作
const handleCancel = () => {
  showCreateDialog.value = false
  editingEmployee.value = null
  Object.assign(employeeForm, {
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'employee',
    status: 'active'
  })
  employeeFormRef.value?.resetFields()
}

// 显示批量删除空闲时间对话框
const showDeleteAvailabilityDialog = (employee) => {
  selectedEmployee.value = employee
  showBatchDeleteAvailabilityDialog.value = true
  clearDeleteAvailabilityForm()
}

// 解析批量删除目标周次文本输入（复用排班页面的逻辑）
const parseDeleteAvailabilityWeeksText = () => {
  const input = deleteAvailabilityForm.targetWeeksText.trim()
  if (!input) {
    deleteAvailabilityForm.targetWeeks = []
    deleteAvailabilityForm.targetAbsoluteWeeks = []
    return
  }
  
  try {
    const offsetWeeks = new Set()
    const displayWeeks = new Set()
    
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
              const offset = weekNumber
              offsetWeeks.add(offset)
              displayWeeks.add(weekNumber)
            }
            continue
          } else {
            // 负数范围，如 "-4--1"
            start = parseInt(part.substring(0, dashIndex))
            end = parseInt(part.substring(dashIndex + 1))
          }
        } else {
          // 正数范围，如 "2-6"
          const rangeParts = part.split('-')
          start = parseInt(rangeParts[0])
          end = parseInt(rangeParts[1])
        }
        
        if (isNaN(start) || isNaN(end)) continue
        
        // 确保范围正确
        const minWeek = Math.min(start, end)
        const maxWeek = Math.max(start, end)
        
        for (let weekNumber = minWeek; weekNumber <= maxWeek; weekNumber++) {
          if (weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) {
            let offset
            if (weekNumber < 0) {
              offset = weekNumber
            } else {
              offset = weekNumber - 1
            }
            
            offsetWeeks.add(offset)
            displayWeeks.add(weekNumber)
          }
        }
      } else {
        // 处理单个数字
        const weekNumber = parseInt(part)
        if (!isNaN(weekNumber) && weekNumber >= -12 && weekNumber <= 12 && weekNumber !== 0) {
          let offset
          if (weekNumber < 0) {
            offset = weekNumber
          } else {
            offset = weekNumber - 1
          }
          
          offsetWeeks.add(offset)
          displayWeeks.add(weekNumber)
        }
      }
    }
    
    // 存储偏移量供后端使用
    deleteAvailabilityForm.targetWeeks = Array.from(offsetWeeks).sort((a, b) => a - b)
    
    // 存储显示用数组
    deleteAvailabilityForm.targetAbsoluteWeeks = Array.from(displayWeeks).sort((a, b) => a - b)
    
  } catch (error) {
    console.error('解析批量删除目标周次失败:', error)
    deleteAvailabilityForm.targetWeeks = []
    deleteAvailabilityForm.targetAbsoluteWeeks = []
  }
}

// 快速设置删除周次
const setQuickDeleteAvailabilityWeeks = (text) => {
  deleteAvailabilityForm.targetWeeksText = text
  parseDeleteAvailabilityWeeksText()
}

// 清空批量删除表单
const clearDeleteAvailabilityForm = () => {
  deleteAvailabilityForm.targetWeeks = []
  deleteAvailabilityForm.targetAbsoluteWeeks = []
  deleteAvailabilityForm.targetWeeksText = ''
}

// 执行批量删除员工空闲时间
const executeDeleteEmployeeAvailability = async () => {
  if (!deleteAvailabilityForm.targetAbsoluteWeeks || deleteAvailabilityForm.targetAbsoluteWeeks.length === 0) {
    ElMessage.warning('请选择要删除的周次范围')
    return
  }
  
  if (!selectedEmployee.value) {
    ElMessage.warning('请选择员工')
    return
  }
  
  try {
    deleteAvailabilityExecuting.value = true
    
    const weekText = deleteAvailabilityForm.targetAbsoluteWeeks.map(week => {
      if (week < 0) return `前${Math.abs(week)}周`
      if (week === 1) return '当前周'
      return `第${week}周`
    }).join('、')
    
    await ElMessageBox.confirm(
      `确定要删除员工"${selectedEmployee.value.name}"在以下周次的所有空闲时间记录吗？\n\n周次：${weekText}\n\n⚠️ 此操作无法恢复`,
      '确认删除',
      {
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    const data = {
      weekOffsets: deleteAvailabilityForm.targetWeeks
    }
    
    const response = await availabilityApi.batchDeleteEmployeeAvailabilityByWeeks(selectedEmployee.value.id, data)
    
    if (response.success) {
      ElMessage.success(`批量删除完成：删除了${response.data.deletedCount}条空闲时间记录`)
      showBatchDeleteAvailabilityDialog.value = false
      clearDeleteAvailabilityForm()
      
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
      console.error('批量删除员工空闲时间失败:', error)
      ElMessage.error(error.response?.data?.message || '批量删除员工空闲时间失败')
    }
  } finally {
    deleteAvailabilityExecuting.value = false
  }
}

onMounted(() => {
  fetchEmployees()
})
</script>

<style lang="scss" scoped>
.employees-container {
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

.search-card {
  margin-bottom: 20px;
  
  .search-input {
    max-width: 400px;
  }
}

.employees-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.employee-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  &.inactive {
    opacity: 0.7;
    background-color: #fafafa;
  }
}

.employee-info {
  .employee-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  
  .employee-details {
    flex: 1;
    min-width: 0;
    
    .employee-name {
      margin: 0 0 8px 0;
      color: #303133;
      font-size: 18px;
      font-weight: 600;
    }
    
    .employee-email {
      margin: 0 0 4px 0;
      color: #606266;
      font-size: 14px;
    }
    
    .employee-phone {
      margin: 0 0 4px 0;
      color: #909399;
      font-size: 12px;
    }
    
    .employee-info {
      margin: 0 0 4px 0;
      font-size: 12px;
      color: #909399;
      
      .employee-no {
        font-family: 'Courier New', monospace;
      }
    }
    
    .employee-position {
      margin: 0;
      font-size: 12px;
      color: #67c23a;
      font-weight: 500;
    }
  }
  
  .employee-status {
    flex-shrink: 0;
  }
}

.employee-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  
  .action-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    
    &.primary-actions {
      .action-btn {
        flex: 1;
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.2s ease;
        
        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
    
    &.secondary-actions {
      justify-content: flex-end;
      
      .action-btn {
        min-width: auto;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 4px;
        
        &.secondary-btn:hover:not(:disabled) {
          background-color: #fdf6ec;
          border-color: #f7ba2a;
          color: #e6a23c;
        }
        
        &.danger-btn:hover:not(:disabled) {
          background-color: #fef0f0;
          border-color: #fab6b6;
          color: #f56c6c;
        }
      }
    }
  }
  
  .action-btn {
    font-size: 13px;
    white-space: nowrap;
    
    &:disabled {
      opacity: 0.5;
    }
  }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
}

// 批量删除对话框样式
.batch-delete-dialog-content {
  .batch-delete-help {
    font-size: 14px;
    line-height: 1.6;
    
    p {
      margin: 8px 0;
    }
    
    ul {
      margin: 4px 0 12px 16px;
      padding: 0;
      
      li {
        margin: 4px 0;
      }
    }
  }
  
  .quick-select-buttons {
    margin-top: 8px;
    
    .el-button {
      margin-right: 8px;
      margin-bottom: 4px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .employees-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .employee-actions {
    .action-group {
      &.primary-actions {
        flex-direction: column;
        gap: 6px;
        
        .action-btn {
          flex: none;
          padding: 8px 12px;
          font-size: 14px;
        }
      }
      
      &.secondary-actions {
        justify-content: center;
        gap: 12px;
        
        .action-btn {
          padding: 6px 10px;
          font-size: 13px;
        }
      }
    }
  }
}
</style>