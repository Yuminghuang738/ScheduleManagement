<script setup lang="ts">
/**
 * ChronoFlow 根组件（最小可运行版）
 *
 * 布局：顶部标题栏 + 左侧分类面板 + 右侧日程表
 * 后续 P4 可在此基础上加全局弹窗控制、响应式等。
 */
import ScheduleTable from './components/ScheduleTable.vue';
import ClassifiedPanel from './components/ClassifiedPanel.vue';
import HighlightPreviewModal from './components/HighlightPreviewModal.vue';
</script>

<template>
  <div class="chrono-app">
    <header class="app-header">
      <h1>ChronoFlow 智能日程</h1>
      <span class="badge">Mock 模式</span>
    </header>

    <div class="app-body">
      <aside class="app-aside">
        <ClassifiedPanel />
      </aside>
      <main class="app-main">
        <ScheduleTable />
      </main>
    </div>

    <HighlightPreviewModal />
  </div>
</template>

<style scoped>
.chrono-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.app-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.badge {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-aside {
  width: 30%;
  min-width: 260px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
