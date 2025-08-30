<template>
  <div class="layout-container">
    <el-container class="desktop-layout">
      <!-- 桌面端侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="desktop-sidebar">
        <div class="sidebar-logo">
          <span v-if="!isCollapse">📅 排班管理系统</span>
          <span v-else>📅</span>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :unique-opened="false"
          router
          background-color="#fff"
          text-color="#303133"
          active-text-color="#409eff"
        >
          <menu-item
            v-for="route in menuRoutes"
            :key="route.path"
            :route="route"
          />
        </el-menu>
      </el-aside>

      <el-container>
        <!-- 头部 -->
        <el-header>
          <div class="header-content">
            <div class="header-left">
              <el-button
                type="text"
                @click="toggleSidebar"
                :icon="isCollapse ? 'Expand' : 'Fold'"
                class="desktop-toggle"
              />
              <!-- 移动端汉堡包菜单按钮 -->
              <el-button
                type="text"
                @click="toggleMobileSidebar"
                class="mobile-toggle"
              >
                <el-icon><Operation /></el-icon>
              </el-button>
              
              <el-breadcrumb separator="/" class="desktop-breadcrumb">
                <el-breadcrumb-item
                  v-for="item in breadcrumbList"
                  :key="item.path"
                  :to="item.path"
                >
                  {{ item.title }}
                </el-breadcrumb-item>
              </el-breadcrumb>
              
              <!-- 移动端页面标题 -->
              <div class="mobile-title">
                {{ currentPageTitle }}
              </div>
            </div>
            
            <div class="header-right">
              <el-dropdown @command="handleCommand">
                <span class="user-info">
                  <el-avatar :size="32" :src="userStore.avatar">
                    {{ userStore.username.charAt(0) }}
                  </el-avatar>
                  <span class="username">{{ userStore.username }}</span>
                  <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="change-password">修改密码</el-dropdown-item>
                    <el-dropdown-item v-if="userStore.userInfo?.role === 'admin'" command="settings">系统设置</el-dropdown-item>
                    <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <!-- 主要内容区 -->
        <el-main>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>

    <!-- 移动端抽屉侧边栏 -->
    <el-drawer
      v-model="mobileDrawerOpen"
      :with-header="false"
      direction="ltr"
      size="280px"
      class="mobile-drawer"
    >
      <div class="mobile-sidebar-content">
        <div class="mobile-sidebar-header">
          <div class="mobile-logo">
            <span class="logo-icon">📅</span>
            <span class="logo-text">排班管理系统</span>
          </div>
          <el-button
            type="text"
            @click="toggleMobileSidebar"
            class="close-button"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="mobile-user-info">
          <el-avatar :size="48" :src="userStore.avatar">
            {{ userStore.username.charAt(0) }}
          </el-avatar>
          <div class="mobile-user-details">
            <div class="mobile-username">{{ userStore.username }}</div>
            <div class="mobile-role">
              {{ userStore.userInfo?.role === 'admin' ? '管理员' : '员工' }}
            </div>
          </div>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          :unique-opened="false"
          router
          background-color="transparent"
          text-color="#303133"
          active-text-color="#409eff"
          class="mobile-menu"
          @select="handleMobileMenuSelect"
        >
          <menu-item
            v-for="route in menuRoutes"
            :key="route.path"
            :route="route"
          />
        </el-menu>
        
        <div class="mobile-sidebar-footer">
          <el-button type="text" @click="handleCommand('change-password')" class="footer-action">
            <el-icon><Lock /></el-icon>
            <span>修改密码</span>
          </el-button>
          <el-button 
            v-if="userStore.userInfo?.role === 'admin'" 
            type="text" 
            @click="handleCommand('settings')" 
            class="footer-action"
          >
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-button>
          <el-button type="text" @click="handleCommand('logout')" class="footer-action logout">
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  ArrowDown,
  Operation,
  Close,
  Lock,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'
import MenuItem from './components/MenuItem.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 桌面端侧边栏折叠状态
const isCollapse = ref(false)
// 移动端抽屉状态
const mobileDrawerOpen = ref(false)

// 切换桌面端侧边栏
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 切换移动端抽屉
const toggleMobileSidebar = () => {
  mobileDrawerOpen.value = !mobileDrawerOpen.value
}

// 处理移动端菜单选择 - 选择后自动关闭抽屉
const handleMobileMenuSelect = () => {
  mobileDrawerOpen.value = false
}

// 当前激活的菜单
const activeMenu = computed(() => {
  const { path } = route
  return path
})

// 当前页面标题 - 用于移动端显示
const currentPageTitle = computed(() => {
  const currentRoute = menuRoutes.value.find(route => route.path === activeMenu.value)
  return currentRoute?.meta?.title || '排班管理系统'
})

// 获取待处理请求数量
const getPendingRequestsCount = () => {
  // 这里应该从store或API获取实际数据
  // 临时返回0，实际项目中应该连接真实数据
  return 0
}

// 菜单路由配置 - 根据用户角色显示不同菜单
const menuRoutes = computed(() => {
  const userRole = userStore.userInfo?.role
  
  if (userRole === 'admin') {
    return [
      {
        path: '/admin/dashboard',
        name: 'AdminDashboard',
        meta: { title: '管理工作台', icon: 'HomeFilled', badge: '' }
      },
      {
        path: '/admin/employees',
        name: 'Employees', 
        meta: { title: '员工管理', icon: 'User', badge: '' }
      },
      {
        path: '/admin/availability',
        name: 'Availability',
        meta: { title: '空闲时间', icon: 'Clock', badge: '' }
      },
      {
        path: '/admin/schedules',
        name: 'Schedules',
        meta: { 
          title: 'AI智能排班', 
          icon: 'Calendar', 
          badge: 'HOT',
          //highlight: true 
        }
      },
      {
        path: '/admin/shift-requests',
        name: 'ShiftRequests',
        meta: { 
          title: '调班申请管理', 
          icon: 'Document', 
          badge: getPendingRequestsCount() > 0 ? getPendingRequestsCount().toString() : ''
        }
      },
      {
        path: '/admin/work-hours',
        name: 'AdminWorkHours',
        meta: { title: '工时统计', icon: 'Timer', badge: '' }
      },
      {
        path: '/admin/referral-management',
        name: 'AdminReferralManagement',
        meta: { title: '推荐人员管理', icon: 'Connection', badge: '' }
      },
      {
        path: '/admin/settings',
        name: 'Settings',
        meta: { title: '系统设置', icon: 'Setting', badge: '' }
      }
    ]
  } else if (userRole === 'employee') {
    return [
      {
        path: '/employee/dashboard',
        name: 'EmployeeDashboard',
        meta: { title: '工作台', icon: 'HomeFilled', badge: '' }
      },
      {
        path: '/employee/availability',
        name: 'EmployeeAvailability',
        meta: { title: '我的空闲时间', icon: 'Clock', badge: '' }
      },
      {
        path: '/employee/shift-requests',
        name: 'EmployeeShiftRequests',
        meta: { title: '我的调班申请', icon: 'Document', badge: '' }
      },
      {
        path: '/employee/work-hours',
        name: 'EmployeeWorkHours',
        meta: { title: '我的工时', icon: 'Timer', badge: '' }
      },
      {
        path: '/employee/referral-management',
        name: 'EmployeeReferralManagement',
        meta: { title: '我的推荐', icon: 'Share', badge: '' }
      }
    ]
  }
  
  return []
})

// 面包屑导航
const breadcrumbList = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta.title
  }))
})

// 处理用户菜单命令
const handleCommand = async (command) => {
  switch (command) {
    case 'change-password':
      // 跳转到修改密码页面
      const userRole = userStore.userInfo?.role
      if (userRole === 'admin') {
        router.push('/admin/change-password')
      } else if (userRole === 'employee') {
        router.push('/employee/change-password')
      }
      break
    case 'settings':
      router.push('/admin/settings')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await userStore.logout()
        ElMessage.success('已成功退出登录')
        router.push('/login')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Logout failed:', error)
        }
      }
      break
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e4e7ed;
  
  img {
    width: 32px;
    height: 32px;
    margin-right: 8px;
  }
  
  span {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.header-content {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  
  .desktop-toggle {
    margin-right: 16px;
  }
  
  .mobile-toggle {
    display: none;
    margin-right: 16px;
  }
  
  .desktop-breadcrumb {
    display: block;
  }
  
  .mobile-title {
    display: none;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.header-right {
  .user-info {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 20px;
    transition: background-color 0.3s;
    
    &:hover {
      background-color: #f5f7fa;
    }
    
    .username {
      margin: 0 8px;
      color: #303133;
    }
    
    .dropdown-icon {
      margin-left: 4px;
      transition: transform 0.3s;
    }
  }
}

.el-menu {
  border-right: none;
}

// 移动端抽屉样式
.mobile-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
  }
}

.mobile-sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.mobile-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  .mobile-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .logo-icon {
      font-size: 24px;
    }
    
    .logo-text {
      font-size: 18px;
      font-weight: 700;
    }
  }
  
  .close-button {
    color: white !important;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
  }
}

.mobile-user-info {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
  
  .mobile-user-details {
    flex: 1;
    
    .mobile-username {
      font-size: 16px;
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 2px;
    }
    
    .mobile-role {
      font-size: 12px;
      color: #718096;
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 10px;
      display: inline-block;
    }
  }
}

.mobile-menu {
  flex: 1;
  border: none !important;
  padding: 8px 0;
  
  :deep(.el-menu-item) {
    margin: 2px 16px;
    border-radius: 8px;
    height: 48px;
    line-height: 48px;
    
    &:hover {
      background-color: #f0f4ff !important;
    }
    
    &.is-active {
      background: linear-gradient(135deg, #667eea, #764ba2) !important;
      color: white !important;
      
      * {
        color: white !important;
      }
    }
  }
}

.mobile-sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  
  .footer-action {
    width: 100%;
    justify-content: flex-start;
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 8px;
    color: #4a5568 !important;
    
    &:hover {
      background-color: #e2e8f0 !important;
    }
    
    &.logout {
      color: #e53e3e !important;
      
      &:hover {
        background-color: #fed7d7 !important;
      }
    }
    
    span {
      margin-left: 8px;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .desktop-layout {
    .desktop-sidebar {
      display: none !important;
    }
  }
  
  .header-content {
    padding: 0 16px;
  }
  
  .header-left {
    .desktop-toggle {
      display: none;
    }
    
    .mobile-toggle {
      display: block;
    }
    
    .desktop-breadcrumb {
      display: none;
    }
    
    .mobile-title {
      display: block;
    }
  }
  
  .header-right {
    .user-info {
      .username {
        display: none;
      }
    }
  }
  
  .el-main {
    padding: 16px !important;
  }
}

// 小屏幕手机端进一步优化
@media (max-width: 480px) {
  .header-content {
    padding: 0 12px;
  }
  
  .mobile-title {
    font-size: 16px !important;
  }
  
  .header-right {
    .user-info {
      padding: 4px;
      
      .el-avatar {
        width: 28px !important;
        height: 28px !important;
      }
      
      .dropdown-icon {
        display: none;
      }
    }
  }
  
  .mobile-drawer {
    :deep(.el-drawer) {
      width: 90vw !important;
      max-width: 300px;
    }
  }
  
  .el-main {
    padding: 12px !important;
  }
}
</style>