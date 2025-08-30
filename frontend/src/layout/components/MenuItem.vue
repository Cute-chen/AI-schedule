<template>
  <!-- 有子菜单的情况 -->
  <el-sub-menu v-if="route.children && route.children.length > 0" :index="route.path">
    <template #title>
      <el-icon v-if="route.meta.icon" :class="{ 'highlight-icon': route.meta.highlight }">
        <component :is="route.meta.icon" />
      </el-icon>
      <span :class="{ 'highlight-text': route.meta.highlight }">{{ route.meta.title }}</span>
      <el-badge 
        v-if="route.meta.badge" 
        :value="route.meta.badge" 
        :type="getBadgeType(route.meta.badge)"
        class="menu-badge"
      />
    </template>
    
    <menu-item
      v-for="child in route.children"
      :key="child.path"
      :route="child"
    />
  </el-sub-menu>
  
  <!-- 没有子菜单的情况 -->
  <el-menu-item v-else :index="route.path" :class="{ 'highlight-menu': route.meta.highlight }">
    <el-icon v-if="route.meta.icon" :class="{ 'highlight-icon': route.meta.highlight }">
      <component :is="route.meta.icon" />
    </el-icon>
    <template #title>
      <div class="menu-title-wrapper">
        <span :class="{ 'highlight-text': route.meta.highlight }">
          {{ route.meta.title }}
        </span>
        <el-badge 
          v-if="route.meta.badge" 
          :value="route.meta.badge" 
          :type="getBadgeType(route.meta.badge)"
          class="menu-badge"
        >
          <span></span>
        </el-badge>
      </div>
    </template>
  </el-menu-item>
</template>

<script setup>
// 定义组件props
defineProps({
  route: {
    type: Object,
    required: true
  }
})

// 递归组件需要定义名称
defineOptions({
  name: 'MenuItem'
})

// 获取badge类型
const getBadgeType = (badge) => {
  if (badge === 'HOT') return 'danger'
  if (/^\d+$/.test(badge)) return 'warning' // 数字badge用warning色
  return 'info'
}
</script>

<style lang="scss" scoped>
.el-icon {
  margin-right: 8px;
  
  &.highlight-icon {
    color: #409eff;
    animation: pulse 2s infinite;
  }
}

.menu-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.highlight-text {
  color: #409eff;
  font-weight: 600;
}

.highlight-menu {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.05) 0%, transparent 100%);
  border-right: 3px solid #409eff;
  
  &:hover {
    background: linear-gradient(90deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
  }
}

.menu-badge {
  margin-left: auto;
  
  :deep(.el-badge__content) {
    font-size: 10px;
    height: 16px;
    line-height: 16px;
    padding: 0 5px;
    min-width: 16px;
    border-radius: 8px;
  }
}

// 脉搏动画
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>