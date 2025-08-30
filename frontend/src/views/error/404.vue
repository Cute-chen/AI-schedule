<template>
  <div class="error-container">
    <div class="error-content">
      <div class="error-image">
        <el-icon size="120"><Warning /></el-icon>
      </div>
      
      <div class="error-info">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">页面未找到</h2>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被删除
        </p>
        
        <div class="error-actions">
          <el-button type="primary" @click="goHome">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
          <el-button @click="goBack">
            <el-icon><Back /></el-icon>
            返回上页
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 返回首页
const goHome = () => {
  router.push('/')
}

// 返回上一页
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.error-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.error-content {
  text-align: center;
  max-width: 500px;
  padding: 40px 20px;
}

.error-image {
  margin-bottom: 32px;
  color: #e6a23c;
}

.error-info {
  .error-code {
    font-size: 72px;
    font-weight: 700;
    color: #303133;
    margin: 0 0 16px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .error-title {
    font-size: 32px;
    font-weight: 600;
    color: #606266;
    margin: 0 0 16px 0;
  }
  
  .error-description {
    font-size: 16px;
    color: #909399;
    margin: 0 0 32px 0;
    line-height: 1.6;
  }
  
  .error-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    
    .el-button {
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 8px;
    }
  }
}

@media (max-width: 480px) {
  .error-content {
    padding: 20px;
  }
  
  .error-info {
    .error-code {
      font-size: 48px;
    }
    
    .error-title {
      font-size: 24px;
    }
    
    .error-actions {
      flex-direction: column;
      align-items: center;
      
      .el-button {
        width: 200px;
      }
    }
  }
}
</style>