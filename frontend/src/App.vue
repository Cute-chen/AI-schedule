<template>
  <div id="app">
    <el-config-provider :locale="locale">
      <router-view />
    </el-config-provider>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useUserStore } from '@/stores/user'

// 设置中文语言
const locale = ref(zhCn)

// 用户状态管理
const userStore = useUserStore()

// 应用启动时初始化用户状态
onMounted(async () => {
  // 如果localStorage中有token，尝试恢复用户状态
  if (userStore.token) {
    try {
      await userStore.initUserState()
    } catch (error) {
      console.error('Failed to initialize user state:', error)
    }
  }
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 全局样式调整 */
.el-button {
  font-weight: 500;
}

.el-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.el-table {
  border-radius: 6px;
}

.el-dialog {
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-container {
    flex-direction: column;
  }
  
  .el-aside {
    width: 100% !important;
    height: auto !important;
  }
}
</style>