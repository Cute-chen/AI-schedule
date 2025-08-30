<template>
  <div class="week-range-selector">
    <div class="selector-header">
      <h3>{{ title }}</h3>
      <div class="quick-actions">
        <div class="action-group">
          <el-button size="small" @click="selectRange(1, 8)">1-8周</el-button>
          <el-button size="small" @click="selectRange(9, 16)">9-16周</el-button>
          <el-button size="small" @click="selectAll">全选</el-button>
          <el-button size="small" @click="clearAll">清空</el-button>
        </div>
        <div class="action-group">
          <el-button size="small" @click="expandAll">全展开</el-button>
          <el-button size="small" @click="collapseAll">全折叠</el-button>
        </div>
      </div>
    </div>
    
    <div class="week-grid">
      <!-- 季度分组 -->
      <div v-for="quarter in quarters" :key="quarter.id" class="quarter-group">
        <div class="quarter-header" @click="toggleQuarterCollapse(quarter.id)">
          <div class="quarter-title">
            <el-icon class="collapse-icon" :class="{ 'expanded': !collapsedQuarters.has(quarter.id) }">
              <CaretRight />
            </el-icon>
            <el-checkbox 
              :model-value="isQuarterSelected(quarter.weeks)"
              :indeterminate="isQuarterIndeterminate(quarter.weeks)"
              @change="toggleQuarter(quarter.weeks, $event)"
              @click.stop
            >
              {{ quarter.label }}
            </el-checkbox>
          </div>
          <div class="quarter-summary">
            <span v-if="getQuarterSelectedCount(quarter.weeks) > 0" class="selected-count">
              已选择 {{ getQuarterSelectedCount(quarter.weeks) }} / {{ quarter.weeks.length }} 周
            </span>
          </div>
        </div>
        
        <transition name="quarter-collapse">
          <div v-show="!collapsedQuarters.has(quarter.id)" class="week-list">
            <div 
              v-for="week in quarter.weeks" 
              :key="week"
              class="week-item"
              :class="{ 
                'selected': selectedWeeks.includes(week),
                'disabled': disabledWeeks.includes(week)
              }"
              @click="toggleWeek(week)"
            >
              <el-checkbox 
                :model-value="selectedWeeks.includes(week)"
                :disabled="disabledWeeks.includes(week)"
                @change="toggleWeek(week)"
                @click.stop
              >
                第{{ week }}周
              </el-checkbox>
              <div class="week-date">{{ formatWeekDate(week) }}</div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 自定义范围输入 -->
    <div class="custom-range">
      <el-form :model="customForm" inline size="small">
        <el-form-item label="自定义范围：">
          <el-input-number 
            v-model="customForm.start" 
            :min="1" 
            :max="52" 
            placeholder="起始周"
            style="width: 80px;"
          />
        </el-form-item>
        <el-form-item label="-">
          <el-input-number 
            v-model="customForm.end" 
            :min="customForm.start || 1" 
            :max="52" 
            placeholder="结束周"
            style="width: 80px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            size="small" 
            @click="applyCustomRange"
            :disabled="!customForm.start || !customForm.end"
          >
            应用
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 选择摘要 -->
    <div class="selection-summary">
      <el-tag v-if="selectedWeeks.length === 0" type="info">未选择任何周</el-tag>
      <el-tag v-else-if="selectedWeeks.length <= 8" type="success">
        已选择：{{ formatSelectedWeeks() }}
      </el-tag>
      <el-tag v-else type="success">
        已选择 {{ selectedWeeks.length }} 周
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { CaretRight } from '@element-plus/icons-vue'
import { settingsService } from '@/utils/settingsService'

const props = defineProps({
  title: {
    type: String,
    default: '选择适用周期'
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  disabledWeeks: {
    type: Array,
    default: () => []
  },
  maxWeeks: {
    type: Number,
    default: 52
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectedWeeks = ref([...props.modelValue])
const customForm = reactive({
  start: null,
  end: null
})

// 季度折叠状态
const collapsedQuarters = ref(new Set([1, 2, 3, 4])) // 默认全部折叠

// 系统周开始日期
const systemWeekStartDate = ref(null)

// 季度分组
const quarters = computed(() => [
  { id: 1, label: '第一季度', weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { id: 2, label: '第二季度', weeks: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { id: 3, label: '第三季度', weeks: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39] },
  { id: 4, label: '第四季度', weeks: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52] }
])

// 切换季度折叠状态
const toggleQuarterCollapse = (quarterId) => {
  const newCollapsed = new Set(collapsedQuarters.value)
  if (newCollapsed.has(quarterId)) {
    newCollapsed.delete(quarterId)
  } else {
    newCollapsed.add(quarterId)
  }
  collapsedQuarters.value = newCollapsed
}

// 切换单个周
const toggleWeek = (week) => {
  if (props.disabledWeeks.includes(week)) return
  
  const index = selectedWeeks.value.indexOf(week)
  if (index > -1) {
    selectedWeeks.value.splice(index, 1)
  } else {
    selectedWeeks.value.push(week)
  }
  selectedWeeks.value.sort((a, b) => a - b)
  updateValue()
}

// 切换季度
const toggleQuarter = (weeks, selected) => {
  const availableWeeks = weeks.filter(w => !props.disabledWeeks.includes(w))
  
  if (selected) {
    availableWeeks.forEach(week => {
      if (!selectedWeeks.value.includes(week)) {
        selectedWeeks.value.push(week)
      }
    })
  } else {
    availableWeeks.forEach(week => {
      const index = selectedWeeks.value.indexOf(week)
      if (index > -1) {
        selectedWeeks.value.splice(index, 1)
      }
    })
  }
  selectedWeeks.value.sort((a, b) => a - b)
  updateValue()
}

// 判断季度是否全选
const isQuarterSelected = (weeks) => {
  const availableWeeks = weeks.filter(w => !props.disabledWeeks.includes(w))
  return availableWeeks.length > 0 && availableWeeks.every(w => selectedWeeks.value.includes(w))
}

// 判断季度是否部分选中
const isQuarterIndeterminate = (weeks) => {
  const availableWeeks = weeks.filter(w => !props.disabledWeeks.includes(w))
  const selectedCount = availableWeeks.filter(w => selectedWeeks.value.includes(w)).length
  return selectedCount > 0 && selectedCount < availableWeeks.length
}

// 获取季度选中的周数量
const getQuarterSelectedCount = (weeks) => {
  const availableWeeks = weeks.filter(w => !props.disabledWeeks.includes(w))
  return availableWeeks.filter(w => selectedWeeks.value.includes(w)).length
}

// 快捷选择范围
const selectRange = (start, end) => {
  selectedWeeks.value = []
  for (let i = start; i <= end; i++) {
    if (!props.disabledWeeks.includes(i)) {
      selectedWeeks.value.push(i)
    }
  }
  updateValue()
}

// 全选
const selectAll = () => {
  selectedWeeks.value = []
  for (let i = 1; i <= props.maxWeeks; i++) {
    if (!props.disabledWeeks.includes(i)) {
      selectedWeeks.value.push(i)
    }
  }
  updateValue()
}

// 清空
const clearAll = () => {
  selectedWeeks.value = []
  updateValue()
}

// 全展开
const expandAll = () => {
  collapsedQuarters.value = new Set()
}

// 全折叠
const collapseAll = () => {
  collapsedQuarters.value = new Set([1, 2, 3, 4])
}

// 应用自定义范围
const applyCustomRange = () => {
  if (customForm.start && customForm.end && customForm.start <= customForm.end) {
    selectRange(customForm.start, customForm.end)
  }
}

// 格式化周日期（使用系统设置的周开始日期）
const formatWeekDate = (week) => {
  if (!systemWeekStartDate.value) {
    return '加载中...'
  }
  
  try {
    // 计算目标周的开始日期
    const weekStart = new Date(systemWeekStartDate.value)
    weekStart.setDate(systemWeekStartDate.value.getDate() + (week - 1) * 7)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  } catch (error) {
    console.error('格式化周日期失败:', error)
    return `第${week}周`
  }
}

const formatDate = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 格式化已选择的周
const formatSelectedWeeks = () => {
  if (selectedWeeks.value.length === 0) return ''
  
  // 合并连续的周
  const ranges = []
  let start = selectedWeeks.value[0]
  let end = selectedWeeks.value[0]
  
  for (let i = 1; i < selectedWeeks.value.length; i++) {
    if (selectedWeeks.value[i] === end + 1) {
      end = selectedWeeks.value[i]
    } else {
      if (start === end) {
        ranges.push(`第${start}周`)
      } else {
        ranges.push(`第${start}-${end}周`)
      }
      start = end = selectedWeeks.value[i]
    }
  }
  
  if (start === end) {
    ranges.push(`第${start}周`)
  } else {
    ranges.push(`第${start}-${end}周`)
  }
  
  return ranges.join(', ')
}

// 更新值
const updateValue = () => {
  emit('update:modelValue', [...selectedWeeks.value])
  emit('change', [...selectedWeeks.value])
}

// 初始化系统设置
const initSettings = async () => {
  try {
    const weekStartDate = await settingsService.getWeekStartDate()
    systemWeekStartDate.value = weekStartDate
  } catch (error) {
    console.error('加载周设置失败:', error)
    // 使用默认值：本周一
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToSubtract)
    systemWeekStartDate.value = monday
  }
}

// 监听外部变化
watch(() => props.modelValue, (newValue) => {
  selectedWeeks.value = [...newValue]
}, { deep: true })

// 初始化
onMounted(() => {
  initSettings()
})
</script>

<style lang="scss" scoped>
.week-range-selector {
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      margin: 0;
      color: #303133;
      font-size: 16px;
    }
    
    .quick-actions {
      display: flex;
      gap: 16px;
      
      .action-group {
        display: flex;
        gap: 8px;
        
        &:not(:last-child) {
          border-right: 1px solid #e4e7ed;
          padding-right: 16px;
        }
      }
    }
  }
  
  .week-grid {
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .quarter-group {
    border-bottom: 1px solid #e4e7ed;
    
    &:last-child {
      border-bottom: none;
    }
    
    .quarter-header {
      background: #f5f7fa;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color 0.2s;
      
      &:hover {
        background: #ebeef5;
      }
      
      .quarter-title {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .collapse-icon {
          transition: transform 0.2s ease;
          color: #909399;
          
          &.expanded {
            transform: rotate(90deg);
          }
        }
        
        .el-checkbox {
          font-weight: 600;
        }
      }
      
      .quarter-summary {
        .selected-count {
          font-size: 12px;
          color: #606266;
          background: #e1f3d8;
          padding: 2px 8px;
          border-radius: 12px;
        }
      }
    }
    
    .week-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1px;
      background: #e4e7ed;
      padding: 1px;
    }
    
    .week-item {
      background: white;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(.disabled) {
        background: #f0f9ff;
      }
      
      &.selected {
        background: #e6f4ff;
        border-color: #40a9ff;
      }
      
      &.disabled {
        background: #f5f5f5;
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .week-date {
        font-size: 11px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }
  
  .custom-range {
    margin: 16px 0;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
  }
  
  .selection-summary {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
    
    .el-tag {
      font-size: 12px;
    }
  }
}

// 折叠动画
.quarter-collapse-enter-active,
.quarter-collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.quarter-collapse-enter-from,
.quarter-collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .week-range-selector {
    .selector-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      
      .quick-actions {
        flex-direction: column;
        gap: 8px;
        
        .action-group {
          justify-content: center;
          border-right: none;
          padding-right: 0;
          
          &:not(:last-child) {
            border-bottom: 1px solid #e4e7ed;
            padding-bottom: 8px;
          }
        }
      }
    }
    
    .quarter-group {
      .quarter-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        
        .quarter-summary {
          align-self: flex-end;
        }
      }
      
      .week-list {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
    
    .custom-range .el-form {
      flex-direction: column;
      
      .el-form-item {
        margin-bottom: 8px;
      }
    }
  }
}
</style>