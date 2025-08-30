<template>
  <div class="captcha-container">
    <div class="captcha-input">
      <el-input
        v-model="inputValue"
        placeholder="请输入验证码"
        size="large"
        maxlength="4"
        clearable
        @input="$emit('input', inputValue)"
      />
    </div>
    <div class="captcha-image" @click="refreshCaptcha">
      <canvas
        ref="captchaCanvas"
        width="120"
        height="40"
        :title="'点击刷新验证码'"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'refresh'])

// Refs
const captchaCanvas = ref(null)
const inputValue = ref(props.modelValue)
const captchaCode = ref('')

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// Watch for input changes
watch(inputValue, (newVal) => {
  emit('update:modelValue', newVal)
})

// 生成随机数字验证码
const generateCaptcha = () => {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaCode.value = result
  return result
}

// 绘制验证码
const drawCaptcha = () => {
  const canvas = captchaCanvas.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const code = generateCaptcha()
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 设置背景
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 绘制干扰线
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = getRandomColor()
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.stroke()
  }
  
  // 绘制验证码文字
  for (let i = 0; i < code.length; i++) {
    ctx.fillStyle = getRandomColor()
    ctx.font = `${20 + Math.random() * 8}px Arial`
    
    // 随机旋转角度
    const angle = (Math.random() - 0.5) * 0.4
    const x = 20 + i * 22
    const y = 25 + Math.random() * 4
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillText(code[i], 0, 0)
    ctx.restore()
  }
  
  // 添加干扰点
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = getRandomColor()
    ctx.beginPath()
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      1,
      0,
      2 * Math.PI
    )
    ctx.fill()
  }
}

// 获取随机颜色
const getRandomColor = () => {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
    '#5cb87a', '#1989fa', '#ff976a', '#ff6b6b', '#4ecdc4'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// 刷新验证码
const refreshCaptcha = () => {
  drawCaptcha()
  emit('refresh', captchaCode.value)
}

// 验证输入是否正确
const validate = () => {
  return inputValue.value.toLowerCase() === captchaCode.value.toLowerCase()
}

// 获取当前验证码
const getCaptchaCode = () => {
  return captchaCode.value
}

// 暴露方法给父组件
defineExpose({
  validate,
  refresh: refreshCaptcha,
  getCaptchaCode
})

// 组件挂载时初始化验证码
onMounted(() => {
  drawCaptcha()
})
</script>

<style lang="scss" scoped>
.captcha-container {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .captcha-input {
    flex: 1;
  }
  
  .captcha-image {
    flex-shrink: 0;
    cursor: pointer;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s;
    
    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
    }
    
    canvas {
      display: block;
    }
  }
}
</style>