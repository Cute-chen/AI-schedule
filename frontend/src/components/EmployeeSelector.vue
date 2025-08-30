<template>
  <div class="employee-selector">
    <el-select
      v-model="selectedValue"
      :placeholder="placeholder"
      :multiple="multiple"
      :clearable="clearable"
      :filterable="filterable"
      :loading="loading"
      :size="size"
      :style="{ width }"
      @change="handleChange"
      @clear="handleClear"
    >
      <!-- 全选选项（仅多选模式） -->
      <el-option
        v-if="multiple && showSelectAll"
        :value="SELECT_ALL_VALUE"
        :label="selectAllLabel"
        class="select-all-option"
      >
        <el-checkbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          {{ selectAllLabel }}
        </el-checkbox>
      </el-option>
      
      <!-- 员工选项 -->
      <el-option
        v-for="employee in filteredEmployees"
        :key="employee.id"
        :value="employee.id"
        :label="getEmployeeLabel(employee)"
        :disabled="employee.status === 'inactive'"
        class="employee-option"
      >
        <div class="employee-option-content">
          <div class="employee-info">
            <span class="employee-name">{{ employee.name }}</span>
            <span class="employee-no">({{ employee.employee_no }})</span>
          </div>
          <div class="employee-details">
            <el-tag v-if="employee.position" size="small" type="info">
              {{ employee.position }}
            </el-tag>
            <el-tag 
              size="small" 
              :type="getStatusTagType(employee.status)"
            >
              {{ getStatusText(employee.status) }}
            </el-tag>
          </div>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { employeeApi } from '@/services/api'

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: () => null
  },
  multiple: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '请选择员工'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  filterable: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['large', 'default', 'small'].includes(value)
  },
  width: {
    type: String,
    default: '200px'
  },
  showSelectAll: {
    type: Boolean,
    default: true
  },
  selectAllLabel: {
    type: String,
    default: '全选'
  },
  includeInactive: {
    type: Boolean,
    default: false
  },
  excludeIds: {
    type: Array,
    default: () => []
  }
})

// Emits
const emits = defineEmits(['update:modelValue', 'change', 'clear'])

// Constants
const SELECT_ALL_VALUE = '__SELECT_ALL__'

// 响应式数据
const loading = ref(false)
const employees = ref([])
const selectedValue = ref(props.multiple ? [] : null)

// 计算属性
const filteredEmployees = computed(() => {
  let filtered = employees.value

  // 过滤非活跃员工
  if (!props.includeInactive) {
    filtered = filtered.filter(emp => emp.status === 'active')
  }

  // 排除指定ID的员工
  if (props.excludeIds.length > 0) {
    filtered = filtered.filter(emp => !props.excludeIds.includes(emp.id))
  }

  return filtered.sort((a, b) => {
    // 首先按状态排序（活跃的在前）
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1
    }
    // 然后按姓名排序
    return a.name.localeCompare(b.name)
  })
})

const isAllSelected = computed(() => {
  if (!props.multiple || filteredEmployees.value.length === 0) return false
  
  const availableIds = filteredEmployees.value.map(emp => emp.id)
  const selectedIds = Array.isArray(selectedValue.value) ? selectedValue.value : []
  
  return availableIds.every(id => selectedIds.includes(id))
})

const isIndeterminate = computed(() => {
  if (!props.multiple || filteredEmployees.value.length === 0) return false
  
  const availableIds = filteredEmployees.value.map(emp => emp.id)
  const selectedIds = Array.isArray(selectedValue.value) ? selectedValue.value : []
  const selectedCount = availableIds.filter(id => selectedIds.includes(id)).length
  
  return selectedCount > 0 && selectedCount < availableIds.length
})

// 方法
const loadEmployees = async () => {
  loading.value = true
  
  try {
    const response = await employeeApi.getEmployees()
    if (response.success) {
      employees.value = response.data.data || []
    } else {
      ElMessage.error('加载员工列表失败')
    }
  } catch (error) {
    console.error('加载员工列表失败:', error)
    ElMessage.error('加载员工列表失败')
  } finally {
    loading.value = false
  }
}

const getEmployeeLabel = (employee) => {
  return `${employee.name} (${employee.employee_no})`
}

const getStatusTagType = (status) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warning'
    case 'leave':
      return 'danger'
    default:
      return 'info'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'active':
      return '在职'
    case 'inactive':
      return '停职'
    case 'leave':
      return '离职'
    default:
      return '未知'
  }
}

const handleChange = (value) => {
  if (props.multiple && Array.isArray(value)) {
    // 处理全选
    if (value.includes(SELECT_ALL_VALUE)) {
      const newValue = value.filter(v => v !== SELECT_ALL_VALUE)
      
      if (isAllSelected.value) {
        // 如果已全选，则清空选择
        selectedValue.value = []
      } else {
        // 如果未全选，则全选所有可用员工
        const allIds = filteredEmployees.value.map(emp => emp.id)
        selectedValue.value = [...new Set([...newValue, ...allIds])]
      }
    } else {
      selectedValue.value = value
    }
  } else {
    selectedValue.value = value
  }
  
  emits('update:modelValue', selectedValue.value)
  emits('change', selectedValue.value)
}

const handleSelectAll = () => {
  if (isAllSelected.value) {
    // 清空选择
    selectedValue.value = []
  } else {
    // 全选
    const allIds = filteredEmployees.value.map(emp => emp.id)
    selectedValue.value = allIds
  }
  
  emits('update:modelValue', selectedValue.value)
  emits('change', selectedValue.value)
}

const handleClear = () => {
  selectedValue.value = props.multiple ? [] : null
  emits('update:modelValue', selectedValue.value)
  emits('clear')
}

// 获取选中的员工信息
const getSelectedEmployees = () => {
  if (!selectedValue.value) return []
  
  const selectedIds = Array.isArray(selectedValue.value) 
    ? selectedValue.value 
    : [selectedValue.value]
    
  return employees.value.filter(emp => selectedIds.includes(emp.id))
}

// 设置选中值
const setSelectedValue = (value) => {
  selectedValue.value = value
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    selectedValue.value = newValue
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  loadEmployees()
})

// 暴露方法
defineExpose({
  getSelectedEmployees,
  setSelectedValue,
  loadEmployees
})
</script>

<style scoped>
.employee-selector {
  display: inline-block;
}

.select-all-option {
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 4px;
}

.select-all-option .el-checkbox {
  width: 100%;
}

.employee-option {
  height: auto !important;
  line-height: normal !important;
  padding: 8px 12px !important;
}

.employee-option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 500;
  color: #303133;
  margin-right: 6px;
}

.employee-no {
  color: #909399;
  font-size: 12px;
}

.employee-details {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

/* 禁用状态样式 */
.employee-option.is-disabled .employee-name {
  color: #c0c4cc;
}

.employee-option.is-disabled .employee-no {
  color: #c0c4cc;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .employee-option-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .employee-details {
    align-self: flex-end;
  }
}
</style>