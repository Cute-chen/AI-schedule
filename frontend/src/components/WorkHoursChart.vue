<template>
  <div class="work-hours-chart">
    <div class="chart-container" ref="chartContainer" :style="{ height: height }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

// Props
const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  type: {
    type: String,
    default: 'bar', // bar, line, pie, personal
    validator: (value) => ['bar', 'line', 'pie', 'personal'].includes(value)
  },
  height: {
    type: String,
    default: '400px'
  },
  title: {
    type: String,
    default: ''
  }
})

// 响应式数据
const chartContainer = ref()
let chartInstance = null

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return
  
  // 销毁已有实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  
  // 创建新实例
  chartInstance = echarts.init(chartContainer.value)
  
  // 根据类型设置配置
  const option = getChartOption()
  
  if (option) {
    chartInstance.setOption(option)
  }
  
  // 自适应窗口大小
  window.addEventListener('resize', handleResize)
}

// 获取图表配置
const getChartOption = () => {
  if (!props.data || props.data.length === 0) {
    return getEmptyOption()
  }
  
  switch (props.type) {
    case 'bar':
      return getBarChartOption()
    case 'line':
      return getLineChartOption()
    case 'pie':
      return getPieChartOption()
    case 'personal':
      return getPersonalChartOption()
    default:
      return getBarChartOption()
  }
}

// 空数据配置
const getEmptyOption = () => ({
  title: {
    text: '暂无数据',
    left: 'center',
    top: 'center',
    textStyle: {
      color: '#999',
      fontSize: 16
    }
  }
})

// 柱状图配置
const getBarChartOption = () => {
  return {
    title: {
      text: props.title || '员工工时统计',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0]
        return `${data.axisValue}<br/>工时: ${data.value} 小时`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.name || item.employeeName || item.date),
      axisLabel: {
        interval: 0,
        rotate: props.data.length > 10 ? 45 : 0,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      name: '工时 (小时)',
      nameTextStyle: {
        fontSize: 12
      },
      axisLabel: {
        fontSize: 12
      }
    },
    series: [{
      name: '工时',
      type: 'bar',
      data: props.data.map(item => ({
        value: item.value || item.totalHours || item.hours,
        itemStyle: {
          color: getBarColor(item.value || item.totalHours || item.hours)
        }
      })),
      barMaxWidth: 60
    }]
  }
}

// 折线图配置
const getLineChartOption = () => {
  return {
    title: {
      text: props.title || '工时趋势图',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0]
        return `${data.axisValue}<br/>工时: ${data.value} 小时`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.date || item.name || `第${item.week}周`),
      axisLabel: {
        interval: 0,
        rotate: props.data.length > 10 ? 45 : 0,
        fontSize: 12,
        formatter: (value) => {
          // 如果是日期格式，只显示月-日
          if (value.includes('-') && value.length === 10) {
            return value.substring(5)
          }
          return value
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '工时 (小时)',
      nameTextStyle: {
        fontSize: 12
      },
      axisLabel: {
        fontSize: 12
      }
    },
    series: [{
      name: '工时',
      type: 'line',
      data: props.data.map(item => item.value || item.hours || item.totalHours),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: '#409EFF'
      },
      lineStyle: {
        color: '#409EFF',
        width: 3
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }]
  }
}

// 饼图配置
const getPieChartOption = () => {
  return {
    title: {
      text: props.title || '工时分布',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} 小时 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      name: '工时',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      data: props.data.map(item => ({
        value: item.value || item.hours || item.totalHours,
        name: item.name || item.employeeName
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: {
        formatter: '{b}: {d}%'
      }
    }]
  }
}

// 个人工时图表配置
const getPersonalChartOption = () => {
  const hasWeeklyData = props.data.some(item => item.week !== undefined)
  
  if (hasWeeklyData) {
    // 按周显示
    return {
      title: {
        text: props.title || '每周工时统计',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const data = params[0]
          return `第${data.axisValue}周<br/>工时: ${data.value} 小时`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: props.data.map(item => `${item.week}`)
      },
      yAxis: {
        type: 'value',
        name: '工时 (小时)'
      },
      series: [{
        name: '工时',
        type: 'bar',
        data: props.data.map(item => item.hours),
        itemStyle: {
          color: '#67C23A'
        }
      }]
    }
  } else {
    // 按日显示
    return {
      title: {
        text: props.title || '每日工时趋势',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const data = params[0]
          return `${data.axisValue}<br/>工时: ${data.value} 小时`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: props.data.map(item => item.date),
        axisLabel: {
          formatter: (value) => {
            // 只显示月-日
            return value.substring(5)
          },
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '工时 (小时)'
      },
      series: [{
        name: '工时',
        type: 'line',
        data: props.data.map(item => item.hours),
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          opacity: 0.3
        }
      }]
    }
  }
}

// 获取柱状图颜色
const getBarColor = (value) => {
  if (value >= 40) return '#67C23A' // 绿色 - 工时充足
  if (value >= 20) return '#E6A23C' // 橙色 - 工时正常
  if (value > 0) return '#F56C6C'   // 红色 - 工时不足
  return '#909399'                   // 灰色 - 无工时
}

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 更新图表
const updateChart = () => {
  if (chartInstance) {
    const option = getChartOption()
    if (option) {
      chartInstance.setOption(option, true)
    }
  }
}

// 监听数据变化
watch(
  () => [props.data, props.type, props.title],
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

// 生命周期
onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  if (chartInstance) {
    window.removeEventListener('resize', handleResize)
    chartInstance.dispose()
    chartInstance = null
  }
})

// 暴露方法
defineExpose({
  updateChart,
  getChartInstance: () => chartInstance
})
</script>

<style scoped>
.work-hours-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  min-height: 300px;
}
</style>