<template>
  <div class="work-hours-statistics">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>📊 工时统计</h1>
      <p>查看员工工时数据</p>
    </div>

    <!-- 查询条件 -->
    <el-card class="filter-section">
      <el-form :model="queryForm" inline>
        <el-form-item label="员工选择">
          <el-select 
            v-model="queryForm.employeeId" 
            placeholder="选择员工（空为全部）"
            clearable
            style="width: 200px"
          >
            <el-option label="全部员工" value="" />
            <el-option 
              v-for="emp in employees" 
              :key="emp.id" 
              :label="`${emp.name} (${emp.employee_no})`" 
              :value="emp.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="周期范围">
          <WeekRangeSelector v-model="queryForm.weekRange" :max-weeks="52" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="queryWorkHours" :loading="loading">
            查询
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工时数据表格 -->
    <el-card class="data-section">
      <template #header>
        <span>工时统计结果</span>
      </template>
      
      <el-table 
        :data="workHoursData" 
        stripe 
        :loading="loading"
        empty-text="暂无工时数据，请先查询"
      >
        <el-table-column prop="employeeInfo.name" label="员工姓名" width="120" />
        <el-table-column prop="employeeInfo.employee_no" label="员工编号" width="120" />
        <el-table-column prop="employeeInfo.position" label="职位" width="120" />
        <el-table-column prop="statistics.totalHours" label="总工时" width="100">
          <template #default="scope">
            <el-tag type="primary">{{ scope.row.statistics.totalHours }}h</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="statistics.workDays" label="工作天数" width="100" />
        <el-table-column prop="statistics.totalShifts" label="总班次" width="100" />
        <el-table-column prop="statistics.averageDailyHours" label="日均工时" width="100">
          <template #default="scope">
            {{ scope.row.statistics.averageDailyHours }}h
          </template>
        </el-table-column>
        <el-table-column label="按周明细" min-width="300">
          <template #default="scope">
            <div class="weekly-detail">
              <el-tag 
                v-for="week in scope.row.statistics.weeklyStats" 
                :key="week.week"
                size="small"
                style="margin-right: 5px; margin-bottom: 2px;"
              >
                第{{ week.week }}周: {{ week.hours }}h
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { workHoursApi, employeeApi } from '@/services/api'
import WeekRangeSelector from '@/components/WeekRangeSelector.vue'

// 响应式数据
const loading = ref(false)
const employees = ref([])
const workHoursData = ref([])

// 查询表单
const queryForm = reactive({
  employeeId: '',
  weekRange: [1, 4] // 默认查询前4周
})

// 加载员工列表
const loadEmployees = async () => {
  try {
    const response = await employeeApi.getEmployees()
    console.log('员工API响应:', response)
    
    // 根据API响应格式处理数据
    if (response.success) {
      employees.value = response.data?.data || response.data || []
    } else if (response.data) {
      // 处理另一种可能的响应格式
      employees.value = Array.isArray(response.data) ? response.data : response.data.data || []
    } else {
      employees.value = []
    }
    
    console.log('加载的员工数据:', employees.value)
  } catch (error) {
    console.error('加载员工列表失败:', error)
    ElMessage.error('加载员工列表失败')
  }
}

// 查询工时数据
const queryWorkHours = async () => {
  if (!queryForm.weekRange || queryForm.weekRange.length === 0) {
    ElMessage.warning('请选择周期范围')
    return
  }
  
  loading.value = true
  
  try {
    const params = {
      startWeek: Math.min(...queryForm.weekRange),
      endWeek: Math.max(...queryForm.weekRange)
    }
    
    if (queryForm.employeeId) {
      params.employeeId = queryForm.employeeId
    }
    
    console.log('查询参数:', params)
    
    const response = await workHoursApi.getAllEmployeesWorkHours(params)
    
    if (response.success) {
      if (queryForm.employeeId) {
        // 单个员工的情况，需要将单个员工数据包装成数组
        workHoursData.value = [response.data]
      } else {
        // 所有员工的情况
        workHoursData.value = response.data.employees || []
      }
      
      console.log('工时数据:', workHoursData.value)
      ElMessage.success('工时统计查询成功')
    } else {
      ElMessage.error(response.message || '查询工时统计失败')
    }
  } catch (error) {
    console.error('查询工时统计失败:', error)
    ElMessage.error('查询工时统计失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEmployees()
})
</script>

<style scoped>
.work-hours-statistics {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.page-header p {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  margin-bottom: 20px;
}

.data-section {
  margin-bottom: 20px;
}

.weekly-detail {
  line-height: 1.5;
}
</style>