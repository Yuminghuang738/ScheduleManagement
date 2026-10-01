<script setup lang="ts">
/**
 * ChronoFlow 根组件
 *
 * 布局：顶栏（品牌 + 实时时钟）+ 左侧信息收纳 + 右侧日程时间轴
 * 设计基调：留白、细线、单一主色，安静但有秩序。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ScheduleTable from './components/ScheduleTable.vue';
import ClassifiedPanel from './components/ClassifiedPanel.vue';
import HighlightPreviewModal from './components/HighlightPreviewModal.vue';

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const pad = (n: number) => String(n).padStart(2, '0');

const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;

const dateText = computed(() => {
  const d = now.value;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
});

onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 30_000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <span class="logo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff"
               stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span class="name">ChronoFlow</span>
        <span class="sub">智能日程</span>
      </div>

      <div class="header-right">
        <span class="clock">{{ dateText }}</span>
        <span v-if="__MOCK_MODE__" class="mock-chip" title="由 MOCK_MODE 控制，设为 false 接入真实逻辑">
          <i />Mock 数据
        </span>
      </div>
    </header>

    <div class="app-body">
      <aside class="side">
        <ClassifiedPanel />
      </aside>
      <main class="main">
        <ScheduleTable />
      </main>
    </div>

    <HighlightPreviewModal />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ---------- 顶栏 ---------- */
.app-header {
  height: 54px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: var(--cf-panel);
  border-bottom: 1px solid var(--cf-line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.logo {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #14a396, #0b857c);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
}

.name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.sub {
  font-size: 12px;
  color: var(--cf-text-3);
  padding-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clock {
  font-size: 13px;
  color: var(--cf-text-2);
  font-variant-numeric: tabular-nums;
}

.mock-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--cf-accent);
  background: var(--cf-accent-soft);
  padding: 3px 9px;
  border-radius: 20px;
  cursor: default;
}
.mock-chip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* ---------- 主体 ---------- */
.app-body {
  flex: 1;
  display: flex;
  gap: 14px;
  padding: 14px;
  min-height: 0;
}

.side {
  width: 302px;
  flex: none;
}

.main {
  flex: 1;
  min-width: 0;
}

.side,
.main {
  background: var(--cf-panel);
  border: 1px solid var(--cf-line);
  border-radius: var(--cf-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
