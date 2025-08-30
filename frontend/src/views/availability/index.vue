<template>
  <div class="availability-container">
    <div class="page-header">
      <div>
        <h1>空闲时间管理</h1>
        <p>智能管理员工空闲时间，支持批量操作和模板化管理</p>
      </div>
      <div class="header-actions">
        <el-button @click="showBatchPanel = true" type="success">
          <el-icon><Operation /></el-icon>
          批量操作
        </el-button>
        <el-button @click="showTimeSlotManager = true">
          <el-icon><Setting /></el-icon>
          时间段管理
        </el-button>
        <el-button type="primary" @click="openQuickAdd">
          <el-icon><Plus /></el-icon>
          快速添加
        </el-button>
      </div>
    </div>

    <!-- 员工选择 -->
    <el-card class="employee-selector">
      <div class="selector-header">
        <div class="selector-title">
          <el-icon><User /></el-icon>
          <span>员工选择</span>
        </div>
        <div class="selector-stats">
          <el-tag type="info" size="small">
            共 {{ employees.length }} 名员工
          </el-tag>
        </div>
      </div>
      
      <div class="selector-content">
        <div class="main-selector">
          <div class="selector-label">当前员工：</div>
          <el-select 
            v-model="selectedEmployee" 
            placeholder="选择要管理空闲时间的员工"
            size="large"
            filterable
            clearable
            @change="handleEmployeeChange"
            class="employee-select"
          >
            <el-option label="所有员工" value="">
              <div class="employee-option all-employees">
                <el-icon><UserFilled /></el-icon>
                <div class="employee-info">
                  <div class="employee-name">所有员工</div>
                  <div class="employee-desc">查看所有员工的空闲时间</div>
                </div>
              </div>
            </el-option>
            
            <el-option
              v-for="employee in employees"
              :key="employee.id"
              :label="`${employee.name} - ${employee.email}`"
              :value="employee.id"
            >
              <div style="display: flex; align-items: center; gap: 10px; padding: 5px 0;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; flex-shrink: 0;">
                  {{ employee.name.charAt(0) }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; color: #303133; font-size: 14px; line-height: 1.2;">
                    {{ employee.name }}
                  </div>
                  <div style="font-size: 12px; color: #909399; line-height: 1.2; margin-top: 2px;">
                    {{ employee.email }}
                    <span v-if="employee.role" style="margin-left: 8px; font-size: 11px; background: #f0f2f5; padding: 1px 4px; border-radius: 8px;">
                      {{ employee.role }}
                    </span>
                  </div>
                </div>
                <div v-if="employee.isActive !== undefined" style="flex-shrink: 0;">
                  <el-tag 
                    :type="employee.isActive ? 'success' : 'info'" 
                    size="small"
                  >
                    {{ employee.isActive ? '在职' : '离职' }}
                  </el-tag>
                </div>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 周范围选择器 -->
    <el-card class="week-range-selector">
      <div class="week-selector-header">
        <div class="selector-mode">
          <el-radio-group v-model="viewMode" @change="handleViewModeChange">
            <el-radio-button label="week">单周视图</el-radio-button>
            <el-radio-button label="range">周期视图</el-radio-button>
          </el-radio-group>
        </div>
        
        <div v-if="viewMode === 'week'" class="week-nav">
          <el-button @click="previousWeek" :icon="ArrowLeft" size="small">上一周</el-button>
          <div class="current-week">
            <h3>{{ currentWeekRangeText || '加载中...' }}</h3>
            <el-button @click="goToCurrentWeek" size="small" type="primary" link>回到本周</el-button>
          </div>
          <el-button @click="nextWeek" :icon="ArrowRight" size="small">下一周</el-button>
        </div>
        
        <div v-else class="week-range-controls">
          <WeekRangeSelector 
            v-model="selectedWeekRange"
            title="选择查看的周期范围"
            :max-weeks="16"
            @change="handleWeekRangeChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 空闲时间日历表格 -->
    <el-card class="availability-calendar" v-loading="loading">
      <!-- 周期视图提示信息 -->
      <div v-if="viewMode === 'range' && selectedWeekRange.length > 0" class="range-info">
        <el-alert
          :title="`正在显示第${Math.min(...selectedWeekRange)}-${Math.max(...selectedWeekRange)}周的数据 (显示第${Math.min(...selectedWeekRange)}周的界面)`"
          type="info"
          show-icon
          :closable="false"
          class="mb-16"
        />
      </div>
      
      <div class="calendar-grid">
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
            <div class="day-date">{{ formatDate(day.date) }}</div>
          </div>
        </div>

        <!-- 时间段行 -->
        <div 
          v-for="timeSlot in timeSlots" 
          :key="timeSlot.id"
          class="time-row"
        >
          <div class="time-cell">
            <div class="time-name">{{ timeSlot.name }}</div>
            <div class="time-period">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</div>
            <div class="required-people">需要{{ timeSlot.requiredPeople }}人</div>
          </div>
          
          <!-- 每天的可用性状态 -->
          <div 
            v-for="day in weekDays"
            :key="`${timeSlot.id}-${day.date}`"
            class="availability-cell"
            @click="toggleAvailability(timeSlot.id, day.date)"
          >
            <div 
              class="availability-status"
              :class="getAvailabilityClass(timeSlot.id, day.date)"
            >
              <div class="status-content">
                <div class="employees-list">
                  <div 
                    v-for="availability in getAvailabilitiesForSlot(timeSlot.id, day.date)"
                    :key="availability.id"
                    class="employee-item"
                    :class="`priority-${availability.priority || 1}`"
                  >
                    <div class="employee-info">
                      <span class="employee-name">{{ availability.employee?.name }}</span>
                      <span class="priority-star">{{ '★'.repeat(availability.priority || 1) }}</span>
                    </div>
                    <div class="employee-actions">
                      <el-button 
                        class="action-btn edit-btn" 
                        size="small" 
                        type="primary" 
                        @click.stop="editAvailability(availability)"
                        title="编辑"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button 
                        class="action-btn delete-btn" 
                        size="small" 
                        type="danger" 
                        @click.stop="deleteAvailability(availability)"
                        title="删除"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>
                
                <!-- 添加员工按钮 -->
                <el-button 
                  v-if="selectedEmployee && !hasEmployeeAvailability(timeSlot.id, day.date, selectedEmployee)"
                  class="add-btn"
                  size="small"
                  type="primary"
                  @click.stop="quickAddAvailability(timeSlot.id, day.date)"
                >
                  +
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 快速添加对话框 -->
    <el-dialog v-model="showQuickAdd" title="快速添加空闲时间" width="600px">
      <el-form :model="quickForm" label-width="100px">
        <el-form-item label="员工" required>
          <el-select v-model="quickForm.employeeId" style="width: 100%">
            <el-option
              v-for="employee in employees"
              :key="employee.id"
              :label="employee.name"
              :value="employee.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="日期范围" required>
          <el-date-picker
            v-model="quickForm.dateRange"
            type="daterange"
            range-separator="到"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="时间段" required>
          <el-checkbox-group v-model="quickForm.timeSlots">
            <el-checkbox 
              v-for="slot in timeSlots"
              :key="slot.id"
              :label="slot.id"
            >
              {{ slot.name }} ({{ slot.startTime }} - {{ slot.endTime }})
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="优先级">
          <el-rate v-model="quickForm.priority" show-text />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="quickForm.notes" 
            type="textarea" 
            :rows="2"
            placeholder="可选：添加备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showQuickAdd = false">取消</el-button>
        <el-button type="primary" @click="submitQuickAdd" :loading="submitting">
          批量添加
        </el-button>
      </template>
    </el-dialog>


    <!-- 时间段管理对话框 -->
    <el-dialog v-model="showTimeSlotManager" title="时间段管理" width="800px">
      <div class="timeslot-manager">
        <div class="manager-header">
          <el-button type="primary" @click="showTimeSlotForm = true">
            <el-icon><Plus /></el-icon>
            添加时间段
          </el-button>
        </div>
        
        <el-table :data="timeSlots" v-loading="timeSlotsLoading">
          <el-table-column prop="name" label="时间段名称" width="120" />
          <el-table-column prop="startTime" label="开始时间" width="100" />
          <el-table-column prop="endTime" label="结束时间" width="100" />
          <el-table-column prop="requiredPeople" label="需要人数" width="100" align="center" />
          <el-table-column prop="isActive" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'warning'">
                {{ row.isActive ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="editTimeSlot(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteTimeSlot(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 时间段表单对话框 -->
    <el-dialog v-model="showTimeSlotForm" :title="editingTimeSlot ? '编辑时间段' : '添加时间段'" width="500px">
      <el-form :model="timeSlotForm" :rules="timeSlotRules" ref="timeSlotFormRef" label-width="100px">
        <el-form-item label="时间段名称" prop="name">
          <el-input v-model="timeSlotForm.name" placeholder="如：早班、中班、晚班" />
        </el-form-item>
        
        <el-form-item label="开始时间" prop="startTime">
          <el-time-picker
            v-model="timeSlotForm.startTime"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择开始时间"
          />
        </el-form-item>
        
        <el-form-item label="结束时间" prop="endTime">
          <el-time-picker
            v-model="timeSlotForm.endTime"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择结束时间"
          />
        </el-form-item>
        
        <el-form-item label="需要人数" prop="requiredPeople">
          <el-input-number v-model="timeSlotForm.requiredPeople" :min="1" :max="10" />
        </el-form-item>
        
        <el-form-item label="状态" prop="isActive" v-if="editingTimeSlot">
          <el-radio-group v-model="timeSlotForm.isActive">
            <el-radio :label="true">启用</el-radio>
            <el-radio :label="false">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="cancelTimeSlotForm">取消</el-button>
        <el-button type="primary" @click="submitTimeSlotForm" :loading="submitting">
          {{ editingTimeSlot ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑空闲时间对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑空闲时间" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="员工">
          <el-select v-model="editForm.employeeId" disabled style="width: 100%">
            <el-option
              v-for="employee in employees"
              :key="employee.id"
              :label="employee.name"
              :value="employee.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="日期">
          <el-date-picker
            v-model="editForm.date"
            type="date"
            disabled
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="优先级">
          <el-rate v-model="editForm.priority" show-text />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="editForm.notes" 
            type="textarea" 
            :rows="3"
            placeholder="可选：添加备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="submitting">
          保存修改
        </el-button>
      </template>
    </el-dialog>


    <!-- 批量操作面板 -->
    <el-dialog v-model="showBatchPanel" title="批量空闲时间操作" width="800px" :close-on-click-modal="false">
      <div class="batch-availability-panel">
        <el-tabs v-model="batchActiveTab">
          <el-tab-pane label="批量设置" name="batch">
            <el-form :model="batchAvailabilityForm" label-width="100px">
              <el-form-item label="目标员工">
                <el-select v-model="batchAvailabilityForm.employeeIds" multiple placeholder="选择员工">
                  <el-option
                    v-for="emp in employees"
                    :key="emp.id"
                    :label="emp.name"
                    :value="emp.id"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="目标周期">
                <WeekRangeSelector 
                  v-model="batchAvailabilityForm.weeks"
                  title="选择要设置空闲时间的周期"
                />
              </el-form-item>
              
              <el-form-item label="时间段安排">
                <div class="time-slot-scheduler">
                  <p class="scheduler-tip">为每个星期几选择对应的时间段：</p>
                  
                  <div class="weekday-timeslots">
                    <div 
                      v-for="(dayName, dayIndex) in weekDayNames" 
                      :key="dayIndex"
                      class="weekday-group"
                    >
                      <div class="weekday-header">
                        <el-checkbox 
                          v-model="batchAvailabilityForm.weekdaySelections[dayIndex].enabled"
                          @change="toggleWeekday(dayIndex)"
                        >
                          {{ dayName }}
                        </el-checkbox>
                      </div>
                      
                      <div 
                        v-if="batchAvailabilityForm.weekdaySelections[dayIndex].enabled" 
                        class="timeslot-selection"
                      >
                        <el-checkbox-group v-model="batchAvailabilityForm.weekdaySelections[dayIndex].timeSlotIds">
                          <el-checkbox 
                            v-for="slot in timeSlots"
                            :key="slot.id"
                            :label="slot.id"
                            size="small"
                          >
                            {{ slot.name }}
                          </el-checkbox>
                        </el-checkbox-group>
                      </div>
                    </div>
                  </div>
                </div>
              </el-form-item>
              
              <el-form-item label="优先级">
                <el-rate v-model="batchAvailabilityForm.priority" show-text />
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  type="primary" 
                  @click="checkAndStartBatchAvailability" 
                  :loading="batchProcessing"
                >
                  批量设置空闲时间
                </el-button>
                <el-button @click="resetBatchAvailabilityForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          
          <el-tab-pane label="按周删除" name="delete">
            <div class="batch-delete-section">
              <el-alert
                title="按周次批量删除空闲时间"
                type="warning"
                :closable="false"
                show-icon
              >
                <template #default>
                  <div class="batch-delete-help">
                    <p><strong>功能说明：</strong></p>
                    <ul>
                      <li>删除指定周次的所有员工的所有空闲时间记录</li>
                      <li>支持删除单个周次或周次范围</li>
                      <li>此操作不可恢复，请谨慎操作</li>
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

              <el-form :model="batchDeleteForm" label-width="100px" style="margin-top: 20px;">
                <el-form-item label="目标周次" required>
                  <el-input
                    v-model="batchDeleteForm.targetWeeksText"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入要删除的周次，如：1,2-4,6"
                    @input="parseBatchDeleteWeeksText"
                  />
                  <div class="quick-select-buttons">
                    <el-button size="small" @click="setQuickBatchDeleteWeeks('1')">当前周</el-button>
                    <el-button size="small" @click="setQuickBatchDeleteWeeks('1-4')">前4周</el-button>
                    <el-button size="small" @click="setQuickBatchDeleteWeeks('1-8')">前8周</el-button>
                    <el-button size="small" @click="clearBatchDeleteForm">清空</el-button>
                  </div>
                </el-form-item>

                <el-form-item v-if="batchDeleteForm.targetAbsoluteWeeks.length > 0">
                  <template #label>
                    <span>将要删除的周次 ({{ batchDeleteForm.targetAbsoluteWeeks.length }}个周次)</span>
                  </template>
                  <el-tag 
                    v-for="week in batchDeleteForm.targetAbsoluteWeeks" 
                    :key="week" 
                    style="margin: 2px;"
                    type="danger"
                  >
                    {{ week < 0 ? `前${Math.abs(week)}周` : week === 1 ? '当前周' : `第${week}周` }}
                  </el-tag>
                </el-form-item>
                
                <el-form-item>
                  <el-button 
                    type="danger" 
                    @click="executeBatchDeleteByWeeks" 
                    :loading="batchProcessing"
                    :disabled="!batchDeleteForm.targetAbsoluteWeeks.length"
                  >
                    批量删除空闲时间
                  </el-button>
                  <el-button @click="clearBatchDeleteForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
          
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Plus, ArrowLeft, ArrowRight, Setting, Collection, Operation, User, UserFilled } from '@element-plus/icons-vue'
import { availabilityApi, employeeApi } from '@/services/api'
import WeekRangeSelector from '@/components/WeekRangeSelector.vue'
import { settingsService } from '@/utils/settingsService'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const employees = ref([])
const availabilities = ref([])
const timeSlots = ref([])
const selectedEmployee = ref('')
const currentWeek = ref(new Date())
const showQuickAdd = ref(false)
const showEditDialog = ref(false)
const showTimeSlotManager = ref(false)
const showTimeSlotForm = ref(false)
const editingTimeSlot = ref(null)
const timeSlotsLoading = ref(false)
const showBatchPanel = ref(false)
const batchProcessing = ref(false)
const viewMode = ref('week')
const selectedWeekRange = ref([])
const batchActiveTab = ref('batch')

// 星期几名称
const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 快速添加表单
const quickForm = reactive({
  employeeId: '',
  dateRange: [],
  timeSlots: [],
  priority: 3,
  notes: ''
})

// 编辑表单
const editForm = reactive({
  id: '',
  employeeId: '',
  timeSlotId: '',
  date: '',
  priority: 3,
  notes: ''
})

// 时间段表单
const timeSlotForm = reactive({
  name: '',
  startTime: '',
  endTime: '',
  requiredPeople: 1,
  isActive: true
})

// 时间段表单验证规则
const timeSlotRules = {
  name: [
    { required: true, message: '请输入时间段名称', trigger: 'blur' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ],
  requiredPeople: [
    { required: true, message: '请输入需要人数', trigger: 'blur' }
  ]
}

const timeSlotFormRef = ref()

// 批量操作表单
const batchAvailabilityForm = reactive({
  employeeIds: [],
  weeks: [],
  weekdaySelections: [
    { enabled: false, timeSlotIds: [] }, // 周日
    { enabled: false, timeSlotIds: [] }, // 周一
    { enabled: false, timeSlotIds: [] }, // 周二
    { enabled: false, timeSlotIds: [] }, // 周三
    { enabled: false, timeSlotIds: [] }, // 周四
    { enabled: false, timeSlotIds: [] }, // 周五
    { enabled: false, timeSlotIds: [] }, // 周六
  ],
  priority: 3,
  notes: ''
})

// 批量删除表单（简化版，只需要周次）
const batchDeleteForm = reactive({
  targetWeeks: [], // 存储偏移量供后端使用
  targetAbsoluteWeeks: [], // 存储显示用的周次描述
  targetWeeksText: ''
})

// 计算当前周的日期
const weekDays = ref([])


// 检查批量设置空闲时间按钮是否可用
const canStartBatchAvailability = computed(() => {
  // 检查是否选择了员工
  if (batchAvailabilityForm.employeeIds.length === 0) return false
  
  // 检查是否选择了周期
  if (batchAvailabilityForm.weeks.length === 0) return false
  
  // 检查是否至少选择了一个星期几和对应的时间段
  const hasValidSelection = batchAvailabilityForm.weekdaySelections.some(
    selection => selection.enabled && selection.timeSlotIds.length > 0
  )
  
  return hasValidSelection
})

// 删除了原来的 canStartBatchDelete 计算属性，新的实现直接在模板中判断

// 计算周天数的异步函数
const calculateWeekDays = async () => {
  try {
    let startOfWeek
    
    if (viewMode.value === 'week') {
      // 单周视图：使用当前选择的周
      startOfWeek = await getStartOfWeek(currentWeek.value)
    } else if (viewMode.value === 'range' && selectedWeekRange.value.length > 0) {
      // 周期视图：使用选择范围中的第一周
      const currentYear = new Date().getFullYear()
      const firstWeek = Math.min(...selectedWeekRange.value)
      startOfWeek = await getWeekStartDate(currentYear, firstWeek)
    } else {
      // 默认使用当前周
      startOfWeek = await getStartOfWeek(currentWeek.value)
    }
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({
        date: date,
        name: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
      })
    }
    weekDays.value = days
  } catch (error) {
    console.error('计算周天数失败:', error)
    weekDays.value = []
  }
}

// 系统周设置
const systemWeekStartDate = ref(null)

// 当前周范围显示
const currentWeekRangeText = ref('')

// 更新周范围显示文本
const updateWeekRangeText = async () => {
  try {
    currentWeekRangeText.value = await formatWeekRange(currentWeek.value)
  } catch (error) {
    console.error('更新周范围文本失败:', error)
    currentWeekRangeText.value = formatDate(currentWeek.value)
  }
}

// 获取一周的开始日期（使用系统设置）
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

// 根据年份和周数获取周开始日期（使用系统设置）
const getWeekStartDate = async (year, weekNumber) => {
  try {
    if (!systemWeekStartDate.value) {
      systemWeekStartDate.value = await settingsService.getWeekStartDate()
    }
    
    // 计算目标周的开始日期
    const targetWeekStart = new Date(systemWeekStartDate.value)
    targetWeekStart.setDate(systemWeekStartDate.value.getDate() + (weekNumber - 1) * 7)
    
    return targetWeekStart
  } catch (error) {
    console.error('获取周开始日期失败:', error)
    // 回退到传统 ISO 8601 计算
    const jan1 = new Date(year, 0, 1)
    const jan1DayOfWeek = jan1.getDay()
    const daysToFirstMonday = jan1DayOfWeek === 1 ? 0 : (jan1DayOfWeek === 0 ? 1 : 8 - jan1DayOfWeek)
    const firstMondayOfYear = new Date(year, 0, 1 + daysToFirstMonday)
    const jan4 = new Date(year, 0, 4)
    const firstWeekStart = jan4 < firstMondayOfYear ? 
      new Date(firstMondayOfYear.getTime() + 7 * 24 * 60 * 60 * 1000) : 
      firstMondayOfYear
    const targetWeekStart = new Date(firstWeekStart)
    targetWeekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7)
    return targetWeekStart
  }
}

// 格式化周范围
const formatWeekRange = async (date) => {
  try {
    const start = await getStartOfWeek(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${formatDate(start)} - ${formatDate(end)}`
  } catch (error) {
    console.error('格式化周范围失败:', error)
    return formatDate(date)
  }
}

// 格式化日期
const formatDate = (date) => {
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  })
}

// 判断是否是今天
const isToday = (date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// 上一周
const previousWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeek.value = newDate
  await calculateWeekDays()
  await updateWeekRangeText()
}

// 下一周
const nextWeek = async () => {
  const newDate = new Date(currentWeek.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeek.value = newDate
  await calculateWeekDays()
  await updateWeekRangeText()
}

// 回到本周
const goToCurrentWeek = async () => {
  currentWeek.value = new Date()
  await calculateWeekDays()
  await updateWeekRangeText()
}

// 切换星期几的启用状态
const toggleWeekday = (dayIndex) => {
  if (!batchAvailabilityForm.weekdaySelections[dayIndex].enabled) {
    // 如果禁用了某一天，清空该天的时间段选择
    batchAvailabilityForm.weekdaySelections[dayIndex].timeSlotIds = []
  }
}

// 切换删除星期几的启用状态
const toggleDeleteWeekday = (dayIndex) => {
  if (!batchDeleteForm.weekdaySelections[dayIndex].enabled) {
    // 如果禁用了某一天，清空该天的时间段选择
    batchDeleteForm.weekdaySelections[dayIndex].timeSlotIds = []
  }
}

// 获取指定时间段和日期的可用性
const getAvailabilitiesForSlot = (timeSlotId, date) => {
  const dateStr = date.toISOString().split('T')[0]
  return availabilities.value.filter(
    a => a.timeSlotId === timeSlotId && a.date === dateStr
  )
}

// 获取可用性状态类
const getAvailabilityClass = (timeSlotId, date) => {
  const items = getAvailabilitiesForSlot(timeSlotId, date)
  if (items.length === 0) return 'empty'
  return 'has-availability'
}

// 检查员工是否已有该时间段的可用性
const hasEmployeeAvailability = (timeSlotId, date, employeeId) => {
  const items = getAvailabilitiesForSlot(timeSlotId, date)
  return items.some(item => item.employeeId === employeeId)
}

// 切换可用性状态（点击单元格时调用）
const toggleAvailability = (timeSlotId, date) => {
  if (!selectedEmployee.value) {
    ElMessage.warning('请先选择员工')
    return
  }
  
  // 检查当前员工是否已有该时间段的可用性
  const hasAvailability = hasEmployeeAvailability(timeSlotId, date, selectedEmployee.value)
  
  if (hasAvailability) {
    // 如果已存在，找到该可用性记录并删除
    const items = getAvailabilitiesForSlot(timeSlotId, date)
    const employeeAvailability = items.find(item => item.employeeId === selectedEmployee.value)
    if (employeeAvailability) {
      deleteAvailability(employeeAvailability)
    }
  } else {
    // 如果不存在，添加可用性记录
    quickAddAvailability(timeSlotId, date)
  }
}

// 快速添加可用性
const quickAddAvailability = (timeSlotId, date) => {
  if (!selectedEmployee.value) {
    ElMessage.warning('请先选择员工')
    return
  }
  // 直接添加可用性记录
  addAvailability(selectedEmployee.value, timeSlotId, date)
}

// 添加可用性记录
const addAvailability = async (employeeId, timeSlotId, date) => {
  try {
    const dateStr = date.toISOString().split('T')[0]
    const data = {
      employeeId,
      timeSlotId,
      date: dateStr,
      priority: 3,
      notes: ''
    }
    
    const response = await availabilityApi.createAvailability(data)
    availabilities.value.push(response.data)
    ElMessage.success('已添加空闲时间')
  } catch (error) {
    console.error('添加失败:', error)
    ElMessage.error('添加失败')
  }
}

// 员工变更处理
const handleEmployeeChange = () => {
  fetchAvailabilities()
}


// 批量添加提交
const submitQuickAdd = async () => {
  if (!quickForm.employeeId) {
    ElMessage.warning('请选择员工')
    return
  }
  
  if (!quickForm.dateRange.length) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  if (!quickForm.timeSlots.length) {
    ElMessage.warning('请选择时间段')
    return
  }
  
  try {
    submitting.value = true
    const data = {
      employeeId: quickForm.employeeId,
      startDate: quickForm.dateRange[0],
      endDate: quickForm.dateRange[1],
      timeSlotIds: quickForm.timeSlots,
      priority: quickForm.priority,
      notes: quickForm.notes
    }
    
    console.log('快速添加-发送的数据:', data)
    console.log('选择的日期范围:', quickForm.dateRange)
    
    await availabilityApi.batchCreateAvailability(data)
    showQuickAdd.value = false
    fetchAvailabilities()
    ElMessage.success('批量添加成功')
  } catch (error) {
    console.error('批量添加失败:', error)
    ElMessage.error('批量添加失败')
  } finally {
    submitting.value = false
  }
}

// 编辑空闲时间
const editAvailability = (availability) => {
  editForm.id = availability.id
  editForm.employeeId = availability.employeeId
  editForm.timeSlotId = availability.timeSlotId
  editForm.date = availability.date
  editForm.priority = availability.priority || 3
  editForm.notes = availability.notes || ''
  showEditDialog.value = true
}

// 提交编辑
const submitEdit = async () => {
  try {
    submitting.value = true
    const data = {
      priority: editForm.priority,
      notes: editForm.notes
    }
    
    await availabilityApi.updateAvailability(editForm.id, data)
    showEditDialog.value = false
    await fetchAvailabilities()
    ElMessage.success('修改成功')
  } catch (error) {
    console.error('修改失败:', error)
    ElMessage.error('修改失败')
  } finally {
    submitting.value = false
  }
}

// 删除空闲时间
const deleteAvailability = async (availability) => {
  try {
    await ElMessageBox.confirm(
      `确认删除员工"${availability.employee?.name}"的空闲时间吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await availabilityApi.deleteAvailability(availability.id)
    await fetchAvailabilities()
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 时间段管理相关函数
const editTimeSlot = (timeSlot) => {
  editingTimeSlot.value = timeSlot
  Object.assign(timeSlotForm, {
    name: timeSlot.name,
    startTime: timeSlot.startTime,
    endTime: timeSlot.endTime,
    requiredPeople: timeSlot.requiredPeople,
    isActive: timeSlot.isActive
  })
  showTimeSlotForm.value = true
}

const deleteTimeSlot = async (timeSlot) => {
  try {
    await ElMessageBox.confirm(
      `确认删除时间段"${timeSlot.name}"吗？如果有关联的空闲时间记录，将停用该时间段。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await availabilityApi.deleteTimeSlot(timeSlot.id)
    await fetchTimeSlots()
    await fetchAvailabilities() // 刷新空闲时间数据
    ElMessage.success('时间段删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除时间段失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const submitTimeSlotForm = async () => {
  try {
    await timeSlotFormRef.value?.validate()
    submitting.value = true
    
    const data = {
      name: timeSlotForm.name,
      startTime: timeSlotForm.startTime,
      endTime: timeSlotForm.endTime,
      dayOfWeek: null, // 始终为通用时间段
      requiredPeople: timeSlotForm.requiredPeople,
      isActive: timeSlotForm.isActive
    }
    
    if (editingTimeSlot.value) {
      await availabilityApi.updateTimeSlot(editingTimeSlot.value.id, data)
      ElMessage.success('时间段更新成功')
    } else {
      await availabilityApi.createTimeSlot(data)
      ElMessage.success('时间段创建成功')
    }
    
    cancelTimeSlotForm()
    await fetchTimeSlots()
    await fetchAvailabilities() // 刷新空闲时间数据
  } catch (error) {
    console.error('时间段操作失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const cancelTimeSlotForm = () => {
  showTimeSlotForm.value = false
  editingTimeSlot.value = null
  Object.assign(timeSlotForm, {
    name: '',
    startTime: '',
    endTime: '',
    requiredPeople: 1,
    isActive: true
  })
  timeSlotFormRef.value?.resetFields()
}

// 打开快速添加对话框
const openQuickAdd = async () => {
  showQuickAdd.value = true
  // 确保员工数据已加载
  if (employees.value.length === 0) {
    await fetchEmployees()
  }
}


// 获取员工列表
const fetchEmployees = async () => {
  try {
    const response = await employeeApi.getEmployees({ size: 1000 }) // 获取所有员工
    // 处理后端返回的嵌套数据结构
    employees.value = response.data?.data || response.data || []
    console.log('员工列表加载成功:', employees.value.length, '个员工')
  } catch (error) {
    console.error('获取员工列表失败:', error)
    ElMessage.error('获取员工列表失败')
    employees.value = []
  }
}

// 获取时间段配置
const fetchTimeSlots = async () => {
  try {
    const response = await availabilityApi.getTimeSlots()
    timeSlots.value = response.data || []
  } catch (error) {
    console.error('获取时间段失败:', error)
    // 使用临时数据作为fallback
    timeSlots.value = [
      { id: 1, name: '早班', startTime: '09:00', endTime: '13:00', requiredPeople: 2 },
      { id: 2, name: '中班', startTime: '13:00', endTime: '17:00', requiredPeople: 2 },
      { id: 3, name: '晚班', startTime: '17:00', endTime: '21:00', requiredPeople: 1 }
    ]
  }
}

// 获取可用性数据
const fetchAvailabilities = async () => {
  try {
    loading.value = true
    const params = {}
    if (selectedEmployee.value) {
      params.employeeId = selectedEmployee.value
    }
    
    if (viewMode.value === 'week') {
      // 单周视图：获取当前周的数据
      const startOfWeek = await getStartOfWeek(currentWeek.value)
      const endDate = new Date(startOfWeek)
      endDate.setDate(startOfWeek.getDate() + 6)
      params.startDate = startOfWeek.toISOString().split('T')[0]
      params.endDate = endDate.toISOString().split('T')[0]
    } else if (viewMode.value === 'range' && selectedWeekRange.value.length > 0) {
      // 周期视图：获取选定周期范围的数据
      const currentYear = new Date().getFullYear()
      const minWeek = Math.min(...selectedWeekRange.value)
      const maxWeek = Math.max(...selectedWeekRange.value)
      
      // 计算第一周和最后一周的日期范围
      const firstWeekStart = await getWeekStartDate(currentYear, minWeek)
      const lastWeekStart = await getWeekStartDate(currentYear, maxWeek)
      const lastWeekEnd = new Date(lastWeekStart)
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
      
      params.startDate = firstWeekStart.toISOString().split('T')[0]
      params.endDate = lastWeekEnd.toISOString().split('T')[0]
    } else {
      // 如果没有选择周期范围，则获取当前周的数据
      const startOfWeek = await getStartOfWeek(currentWeek.value)
      const endDate = new Date(startOfWeek)
      endDate.setDate(startOfWeek.getDate() + 6)
      params.startDate = startOfWeek.toISOString().split('T')[0]
      params.endDate = endDate.toISOString().split('T')[0]
    }
    
    const response = await availabilityApi.getAvailabilities(params)
    availabilities.value = response.data || []
  } catch (error) {
    console.error('获取可用性数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 新增方法
const handleViewModeChange = async () => {
  if (viewMode.value === 'range') {
    selectedWeekRange.value = []
  }
  // 切换视图模式后重新计算周天数和获取数据
  await calculateWeekDays()
  await fetchAvailabilities()
}

const handleWeekRangeChange = async (weeks) => {
  // 处理周期范围变化
  selectedWeekRange.value = weeks
  if (viewMode.value === 'range') {
    await calculateWeekDays()
    await fetchAvailabilities()
  }
}

// 检查并启动批量设置空闲时间
const checkAndStartBatchAvailability = async () => {
  const missingItems = []
  
  // 检查是否选择了员工
  if (batchAvailabilityForm.employeeIds.length === 0) {
    missingItems.push('目标员工')
  }
  
  // 检查是否选择了周期
  if (batchAvailabilityForm.weeks.length === 0) {
    missingItems.push('目标周期')
  }
  
  // 检查是否至少选择了一个星期几和对应的时间段
  const hasValidSelection = batchAvailabilityForm.weekdaySelections.some(
    selection => selection.enabled && selection.timeSlotIds.length > 0
  )
  
  if (!hasValidSelection) {
    missingItems.push('至少一个星期几的时间段')
  }
  
  if (missingItems.length > 0) {
    ElMessage.warning(`请先选择：${missingItems.join('、')}`)
    return
  }
  
  // 如果所有必要信息都已填写，继续执行批量操作
  await startBatchAvailability()
}

const startBatchAvailability = async () => {
  if (batchAvailabilityForm.employeeIds.length === 0) {
    ElMessage.warning('请选择员工')
    return
  }
  
  if (batchAvailabilityForm.weeks.length === 0) {
    ElMessage.warning('请选择目标周期')
    return
  }
  
  // 检查是否至少选择了一个星期几和对应的时间段
  const hasValidSelection = batchAvailabilityForm.weekdaySelections.some(
    selection => selection.enabled && selection.timeSlotIds.length > 0
  )
  
  if (!hasValidSelection) {
    ElMessage.warning('请至少为一个星期几选择时间段')
    return
  }
  
  try {
    batchProcessing.value = true
    
    // 计算需要添加空闲时间的具体日期和时间段组合
    const availabilityItems = []
    const currentYear = new Date().getFullYear()
    
    console.log('开始计算具体的空闲时间安排:', batchAvailabilityForm.weeks, batchAvailabilityForm.weekdaySelections)
    
    for (const weekNumber of batchAvailabilityForm.weeks) {
      try {
        const weekStart = await getWeekStartDate(currentYear, weekNumber)
        console.log(`第${weekNumber}周开始日期:`, weekStart, `星期${weekStart.getDay()}`)  // 调试日志
        
        // 遍历每个星期几的选择
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const daySelection = batchAvailabilityForm.weekdaySelections[dayIndex]
          
          if (daySelection.enabled && daySelection.timeSlotIds.length > 0) {
            // 计算该周该星期几的具体日期
            const targetDate = new Date(weekStart)
            console.log(`选择的dayIndex=${dayIndex}(${weekDayNames[dayIndex]}), weekStart=${weekStart.toDateString()}(星期${weekStart.getDay()})`)
            
            // 根据weekStart的实际星期几来计算偏移
            const weekStartDay = weekStart.getDay()  // 0=周日, 1=周一, ..., 6=周六
            
            // 计算从weekStart到目标dayIndex的天数差
            let daysDiff = dayIndex - weekStartDay
            if (daysDiff < 0) {
              daysDiff += 7  // 如果是上一周的日期，加7天
            }
            
            targetDate.setDate(weekStart.getDate() + daysDiff)
            const dateString = targetDate.toISOString().split('T')[0]
            console.log(`目标日期: ${targetDate.toDateString()}(星期${targetDate.getDay()})`)
            
            // 为选择的每个时间段创建记录
            for (const timeSlotId of daySelection.timeSlotIds) {
              availabilityItems.push({
                date: dateString,
                timeSlotId: timeSlotId,
                weekNumber: weekNumber,
                dayOfWeek: dayIndex,
                dayName: weekDayNames[dayIndex]
              })
            }
          }
        }
      } catch (error) {
        console.error(`计算第${weekNumber}周日期失败:`, error)
        ElMessage.error(`计算第${weekNumber}周日期失败`)
        return
      }
    }
    
    if (availabilityItems.length === 0) {
      ElMessage.warning('没有生成任何空闲时间记录，请检查选择')
      return
    }
    
    console.log('生成的空闲时间记录:', availabilityItems)
    
    // 为每个员工创建所有的空闲时间记录
    let createdCount = 0
    const totalCount = batchAvailabilityForm.employeeIds.length * availabilityItems.length
    
    for (const employeeId of batchAvailabilityForm.employeeIds) {
      for (const item of availabilityItems) {
        try {
          const availabilityData = {
            employeeId: employeeId,
            timeSlotId: item.timeSlotId,
            date: item.date,
            priority: batchAvailabilityForm.priority,
            notes: batchAvailabilityForm.notes
          }
          
          await availabilityApi.createAvailability(availabilityData)
          createdCount++
          
          console.log(`创建空闲时间记录: ${item.dayName} ${item.date} 时间段${item.timeSlotId}`)
        } catch (error) {
          console.error(`创建空闲时间记录失败:`, item, error)
          // 继续创建其他记录，不中断整个过程
        }
      }
    }
    
    if (createdCount === totalCount) {
      ElMessage.success(`批量设置空闲时间完成，共创建了 ${createdCount} 条记录`)
    } else if (createdCount > 0) {
      ElMessage.warning(`部分创建成功，共创建了 ${createdCount}/${totalCount} 条记录`)
    } else {
      ElMessage.error('批量设置空闲时间失败，没有创建任何记录')
    }
    
    showBatchPanel.value = false
    fetchAvailabilities()
  } catch (error) {
    console.error('批量设置空闲时间失败:', error)
    ElMessage.error('批量设置空闲时间失败')
  } finally {
    batchProcessing.value = false
  }
}

const resetBatchAvailabilityForm = () => {
  Object.assign(batchAvailabilityForm, {
    employeeIds: [],
    weeks: [],
    weekdaySelections: [
      { enabled: false, timeSlotIds: [] }, // 周日
      { enabled: false, timeSlotIds: [] }, // 周一
      { enabled: false, timeSlotIds: [] }, // 周二
      { enabled: false, timeSlotIds: [] }, // 周三
      { enabled: false, timeSlotIds: [] }, // 周四
      { enabled: false, timeSlotIds: [] }, // 周五
      { enabled: false, timeSlotIds: [] }, // 周六
    ],
    priority: 3,
    notes: ''
  })
}

// 解析批量删除目标周次文本输入
const parseBatchDeleteWeeksText = () => {
  const input = batchDeleteForm.targetWeeksText.trim()
  if (!input) {
    batchDeleteForm.targetWeeks = []
    batchDeleteForm.targetAbsoluteWeeks = []
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
    batchDeleteForm.targetWeeks = Array.from(offsetWeeks).sort((a, b) => a - b)
    
    // 存储显示用数组
    batchDeleteForm.targetAbsoluteWeeks = Array.from(displayWeeks).sort((a, b) => a - b)
    
  } catch (error) {
    console.error('解析批量删除目标周次失败:', error)
    batchDeleteForm.targetWeeks = []
    batchDeleteForm.targetAbsoluteWeeks = []
  }
}

// 快速设置删除周次
const setQuickBatchDeleteWeeks = (text) => {
  batchDeleteForm.targetWeeksText = text
  parseBatchDeleteWeeksText()
}

// 执行按周次批量删除所有员工的空闲时间
const executeBatchDeleteByWeeks = async () => {
  if (!batchDeleteForm.targetAbsoluteWeeks || batchDeleteForm.targetAbsoluteWeeks.length === 0) {
    ElMessage.warning('请选择要删除的周次范围')
    return
  }
  
  try {
    batchProcessing.value = true
    
    const weekText = batchDeleteForm.targetAbsoluteWeeks.map(week => {
      if (week < 0) return `前${Math.abs(week)}周`
      if (week === 1) return '当前周'
      return `第${week}周`
    }).join('、')
    
    await ElMessageBox.confirm(
      `确定要删除以下周次的所有员工的所有空闲时间记录吗？\n\n周次：${weekText}\n\n⚠️ 此操作无法恢复`,
      '确认删除',
      {
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    const data = {
      weekOffsets: batchDeleteForm.targetWeeks
    }
    
    const response = await availabilityApi.batchDeleteAllAvailabilityByWeeks(data)
    
    if (response.success) {
      ElMessage.success(`批量删除完成：删除了${response.data.deletedCount}条空闲时间记录`)
      showBatchPanel.value = false
      clearBatchDeleteForm()
      
      // 刷新页面数据
      await fetchAvailabilities()
      
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
      console.error('批量删除所有员工空闲时间失败:', error)
      ElMessage.error(error.response?.data?.message || '批量删除空闲时间失败')
    }
  } finally {
    batchProcessing.value = false
  }
}

// 清空批量删除表单
const clearBatchDeleteForm = () => {
  batchDeleteForm.targetWeeks = []
  batchDeleteForm.targetAbsoluteWeeks = []
  batchDeleteForm.targetWeeksText = ''
}


// 监听周变化
watch(currentWeek, async () => {
  await fetchAvailabilities()
})

// 监听视图模式和周期范围变化
watch([viewMode, selectedWeekRange], async () => {
  await calculateWeekDays()
}, { deep: true })

onMounted(async () => {
  // 初始化系统设置
  if (!systemWeekStartDate.value) {
    try {
      systemWeekStartDate.value = await settingsService.getWeekStartDate()
    } catch (error) {
      console.error('加载系统周设置失败:', error)
    }
  }
  
  await fetchEmployees()
  await fetchTimeSlots()
  await calculateWeekDays()
  await updateWeekRangeText()
  await fetchAvailabilities()
})
</script>

<style lang="scss" scoped>
.availability-container {
  padding: 20px;
}

.range-info {
  margin-bottom: 16px;
}

.mb-16 {
  margin-bottom: 16px !important;
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
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.employee-selector {
  margin-bottom: 20px;
  
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    .selector-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #303133;
      font-size: 16px;
    }
    
    .selector-stats {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
  
  .selector-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .main-selector {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .selector-label {
        font-weight: 600;
        color: #303133;
        white-space: nowrap;
      }
      
      .employee-select {
        flex: 1;
        min-width: 400px;
        max-width: 600px;
        
        :deep(.el-select__wrapper) {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 2px solid #e4e7ed;
          transition: all 0.3s ease;
          
          &:hover {
            border-color: #c0c4cc;
          }
          
          &.is-focused {
            border-color: #409eff;
            box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
          }
        }
      }
    }
    
  }
}

// 员工下拉选项样式优化
:deep(.el-select-dropdown__item) {
  padding: 8px 20px !important;
  height: auto !important;
  line-height: normal !important;
}

.week-range-selector {
  margin-bottom: 20px;
  
  .week-selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    
    .selector-mode {
      display: flex;
      align-items: center;
    }
    
    .week-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      flex: 1;
      
      .current-week {
        text-align: center;
        
        h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #303133;
        }
      }
    }
    
    .week-range-controls {
      flex: 1;
      margin-left: 24px;
    }
  }
}

.availability-calendar {
  .calendar-grid {
    display: grid;
    grid-template-rows: auto;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .calendar-header {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
    background: #f8f9fa;
    border-bottom: 2px solid #e4e7ed;
    
    .time-cell, .day-cell {
      padding: 12px;
      border-right: 1px solid #e4e7ed;
      font-weight: 600;
      text-align: center;
    }
    
    .day-cell {
      &.today {
        background: #e6f4ff;
        color: #1890ff;
      }
      
      .day-name {
        font-size: 14px;
      }
      
      .day-date {
        font-size: 12px;
        margin-top: 4px;
        opacity: 0.8;
      }
    }
  }
  
  .time-row {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
    min-height: 80px;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e4e7ed;
    }
    
    .time-cell {
      padding: 16px;
      border-right: 1px solid #e4e7ed;
      background: #fafafa;
      
      .time-name {
        font-weight: 600;
        color: #303133;
      }
      
      .time-period {
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
      }
      
      .required-people {
        font-size: 11px;
        color: #909399;
        margin-top: 4px;
      }
    }
    
    .availability-cell {
      padding: 8px;
      border-right: 1px solid #e4e7ed;
      cursor: pointer;
      transition: background-color 0.2s;
      
      &:hover {
        background: #f0f9ff;
      }
      
      .availability-status {
        height: 100%;
        border-radius: 4px;
        
        &.empty {
          background: #fafafa;
          border: 1px dashed #d9d9d9;
          
          &:hover {
            border-color: #1890ff;
          }
        }
        
        &.has-availability {
          background: #e6f4ff;
          border: 1px solid #b3d8ff;
        }
      }
      
      .status-content {
        padding: 4px;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .employees-list {
        flex: 1;
      }
      
      .employee-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        padding: 4px 6px;
        margin-bottom: 2px;
        border-radius: 4px;
        position: relative;
        
        &.priority-1 { background: #fff2e8; }
        &.priority-2 { background: #fff7e6; }
        &.priority-3 { background: #f6ffed; }
        &.priority-4 { background: #e6f4ff; }
        &.priority-5 { background: #f9f0ff; }
        
        &:hover {
          .employee-actions {
            opacity: 1;
          }
        }
        
        .employee-info {
          display: flex;
          align-items: center;
          flex: 1;
          
          .employee-name {
            font-weight: 500;
            margin-right: 4px;
          }
          
          .priority-star {
            color: #faad14;
            font-size: 10px;
          }
        }
        
        .employee-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s;
          
          .action-btn {
            width: 16px;
            height: 16px;
            padding: 0;
            font-size: 10px;
            border: none;
            
            &.edit-btn {
              background: #409eff;
              color: white;
              
              &:hover {
                background: #66b1ff;
              }
            }
            
            &.delete-btn {
              background: #f56c6c;
              color: white;
              
              &:hover {
                background: #f78989;
              }
            }
          }
        }
      }
      
      .add-btn {
        align-self: center;
        width: 24px;
        height: 24px;
        padding: 0;
        font-size: 14px;
        font-weight: bold;
      }
    }
  }
}


// 时间段管理样式
.timeslot-manager {
  .manager-header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .el-table {
    border-radius: 8px;
    overflow: hidden;
  }
}

// 批量操作界面样式
.time-slot-scheduler {
  .scheduler-tip {
    color: #606266;
    font-size: 14px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #f5f7fa;
    border-radius: 4px;
    border-left: 3px solid #409eff;
  }
  
  .weekday-timeslots {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .weekday-group {
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    padding: 12px;
    background: #fafafa;
    transition: all 0.2s;
    
    &:hover {
      background: #f0f9ff;
    }
    
    .weekday-header {
      margin-bottom: 8px;
      
      .el-checkbox {
        font-weight: 600;
        color: #303133;
      }
    }
    
    .timeslot-selection {
      margin-left: 24px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e4e7ed;
      
      .el-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        
        .el-checkbox {
          margin-right: 0;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #e4e7ed;
          transition: all 0.2s;
          
          &:hover {
            background: #e6f4ff;
            border-color: #b3d8ff;
          }
          
          &.is-checked {
            background: #409eff;
            color: white;
            border-color: #409eff;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .calendar-grid {
    overflow-x: auto;
  }
  
  .calendar-header,
  .time-row {
    min-width: 800px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .employee-selector {
    .selector-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    
    .selector-content {
      .main-selector {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        
        .employee-select {
          min-width: unset;
          width: 100%;
        }
      }
      
    }
  }
  
  .time-slot-scheduler {
    .weekday-group {
      .timeslot-selection {
        margin-left: 0;
        
        .el-checkbox-group {
          flex-direction: column;
          gap: 4px;
          
          .el-checkbox {
            width: 100%;
            justify-content: flex-start;
          }
        }
      }
    }
  }
}

// 批量删除对话框样式
.batch-delete-section {
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
</style>