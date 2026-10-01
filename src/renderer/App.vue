<script setup lang="ts">
/**
 * ChronoFlow 根组件
 * 骨架：左侧 ClassifiedPanel + 右侧 ScheduleTable + HighlightPreview
 */
import ScheduleTable from './components/ScheduleTable.vue';
import ClassifiedPanel from './components/ClassifiedPanel.vue';
import HighlightPreviewModal from './components/HighlightPreviewModal.vue';
</script>

<template>
  <!-- ==================== 本模块由 P4 实现 ==================== -->
  <!-- TODO: P4 填充此模板 -->

  <div class="chrono-app">
    <ClassifiedPanel />
    <ScheduleTable />
    <HighlightPreviewModal />
  </div>
</template>

<style scoped>
/* P4 自行设计 */
</style>