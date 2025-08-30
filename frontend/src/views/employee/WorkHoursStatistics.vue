<template>
  <div class="work-hours-statistics">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>⏰ 我的工时统计</h1>
      <p>查看您的工作时长记录</p>
    </div>

    <!-- 查询条件 -->
    <el-card class="filter-section">
      <el-form :model="queryForm" inline>
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

    <!-- 工时数据展示 -->
    <el-card class="data-section" v-if="workHoursData">
      <template #header>
        <span>工时统计结果</span>
      </template>
      
      <!-- 个人工时汇总 -->
      <div class="summary-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">总工时</div>
              <div class="summary-value">{{ workHoursData.statistics?.totalHours || 0 }}h</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">工作天数</div>
              <div class="summary-value">{{ workHoursData.statistics?.workDays || 0 }}天</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">总班次</div>
              <div class="summary-value">{{ workHoursData.statistics?.totalShifts || 0 }}次</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">日均工时</div>
              <div class="summary-value">{{ workHoursData.statistics?.averageDailyHours || 0 }}h</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 按周详情 -->
      <div class="weekly-section" v-if="workHoursData.statistics?.weeklyStats?.length > 0">
        <h3>按周统计</h3>
        <el-table :data="workHoursData.statistics.weeklyStats" stripe>
          <el-table-column prop="week" label="周数" width="80" />
          <el-table-column prop="hours" label="工时" width="100">
            <template #default="scope">
              <el-tag type="primary">{{ scope.row.hours }}h</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="shifts" label="班次" width="80" />
          <el-table-column label="占比" width="100">
            <template #default="scope">
              {{ getPercentage(scope.row.hours) }}%
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 按日详情 -->
      <div class="daily-section" v-if="workHoursData.statistics?.dailyStats?.length > 0">
        <h3>按日统计</h3>
        <el-table :data="workHoursData.statistics.dailyStats" stripe>
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column label="星期" width="80">
            <template #default="scope">
              {{ getWeekday(scope.row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="hours" label="工时" width="100">
            <template #default="scope">
              <el-tag :type="getHoursTagType(scope.row.hours)" size="small">
                {{ scope.row.hours }}h
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="shifts" label="班次" width="80" />
        </el-table>
      </div>
    </el-card>

    <!-- 空状态提示 -->
    <el-card class="data-section" v-else-if="!loading">
      <el-empty description="暂无工时数据，请先查询" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { workHoursApi } from '@/services/api'
import WeekRangeSelector from '@/components/WeekRangeSelector.vue'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const workHoursData = ref(null)

// 查询表单
const queryForm = reactive({
  weekRange: [1, 4] // 默认查询前4周
})

// 查询工时数据
const queryWorkHours = async () => {
  if (queryForm.weekRange.length === 0) {
    ElMessage.warning('请选择周期范围')
    return
  }
  
  loading.value = true
  
  try {
    const params = {
      employeeId: userStore.userInfo?.id,
      startWeek: Math.min(...queryForm.weekRange),
      endWeek: Math.max(...queryForm.weekRange)
    }
    
    console.log('查询个人工时参数:', params)
    
    const response = await workHoursApi.getEmployeeWorkHours(params)
    
    if (response.success && response.data) {
      workHoursData.value = response.data
      console.log('个人工时数据:', response.data)
      ElMessage.success('个人工时数据查询成功')
    } else {
      ElMessage.error(response.message || '查询个人工时数据失败')
    }
  } catch (error) {
    console.error('查询个人工时数据失败:', error)
    ElMessage.error('查询个人工时数据失败')
  } finally {
    loading.value = false
  }
}

// 获取百分比
const getPercentage = (hours) => {
  if (!workHoursData.value?.statistics?.totalHours) return 0
  return Math.round((hours / workHoursData.value.statistics.totalHours) * 100)
}

// 获取星期几
const getWeekday = (date) => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(date)
  return '周' + weekdays[d.getDay()]
}

// 获取工时标签类型
const getHoursTagType = (hours) => {
  if (hours >= 8) return 'success'
  if (hours >= 4) return 'warning'
  return 'info'
}

onMounted(() => {
  // 初始加载数据
  queryWorkHours()
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

.summary-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.summary-item {
  text-align: center;
  padding: 15px;
}

.summary-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.weekly-section,
.daily-section {
  margin-bottom: 30px;
}

.weekly-section h3,
.daily-section h3 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}
</style>