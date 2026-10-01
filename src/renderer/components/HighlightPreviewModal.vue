<script setup lang="ts">
/**
 * 划重点预览弹窗（Task 4，此处实现最小可用版本以打通 Task 3 链路）
 *
 * Props：visible / highlights / draftSchedules / fullText
 * Emits：close / imported
 * - 左栏：原文全文，按 highlight 的 startOffset~endOffset 高亮
 * - 右栏：每条 highlight → 类型标签 + 文本 + 置信度
 * - 底部「全部导入日程表」：逐条 create → emit('imported') → emit('close')
 */
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useAppApi } from '../hooks/useAppApi';
import type { HighlightSegment, HighlightType, ScheduleItem } from '../../shared/types';

const props = defineProps<{
  visible: boolean;
  highlights: HighlightSegment[];
  draftSchedules: ScheduleItem[];
  fullText: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'imported'): void;
}>();

const api = useAppApi();
const importing = ref(false);

/* ---------- 类型标签映射 ---------- */
const TYPE_TEXT: Record<HighlightType, string> = {
  task: '任务',
  deadline: '截止',
  event: '事件',
  contact: '联系人',
  location: '地点',
  reminder: '提醒',
};
const TYPE_COLOR: Record<HighlightType, string> = {
  task: '#dbeafe',
  deadline: '#fee2e2',
  event: '#d1fae5',
  contact: '#ede9fe',
  location: '#fff7ed',
  reminder: '#fef9c3',
};

/* ---------- 把全文按 highlight 切成片段，命中的高亮 ---------- */
interface Seg {
  text: string;
  type: HighlightType | null;
}
const segments = computed<Seg[]>(() => {
  const text = props.fullText || '';
  const sorted = [...props.highlights].sort((a, b) => a.startOffset - b.startOffset);
  const out: Seg[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.startOffset > cursor) out.push({ text: text.slice(cursor, h.startOffset), type: null });
    out.push({ text: text.slice(h.startOffset, h.endOffset), type: h.type });
    cursor = Math.max(cursor, h.endOffset);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), type: null });
  return out;
});

async function importAll() {
  if (!props.draftSchedules.length) {
    ElMessage.warning('没有可导入的日程');
    return;
  }
  importing.value = true;
  try {
    for (const s of props.draftSchedules) {
      await api.create({
        title: s.title,
        description: s.description,
        startTime: s.startTime,
        endTime: s.endTime,
        isAllDay: s.isAllDay,
        priority: s.priority,
        tags: s.tags,
        color: s.color,
        location: s.location,
        contact: s.contact,
      });
    }
    ElMessage.success(`已导入 ${props.draftSchedules.length} 条日程`);
    emit('imported');
    emit('close');
  } catch {
    // 错误提示已在 useAppApi 统一弹出
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="划重点预览"
    width="80%"
    @update:model-value="v => !v && emit('close')"
  >
    <div class="hp">
      <div class="hp-left">
        <div class="hp-block-title">原文</div>
        <p class="hp-text">
          <span
            v-for="(seg, i) in segments"
            :key="i"
            :style="seg.type ? { background: TYPE_COLOR[seg.type] } : {}"
          >{{ seg.text }}</span>
        </p>
      </div>

      <div class="hp-right">
        <div class="hp-block-title">识别到的重点（{{ highlights.length }}）</div>
        <div class="hp-list">
          <div v-for="(h, i) in highlights" :key="i" class="hp-item">
            <span class="hp-type" :style="{ background: TYPE_COLOR[h.type] }">
              {{ TYPE_TEXT[h.type] ?? h.type }}
            </span>
            <span class="hp-item-text">{{ h.text }}</span>
            <el-progress
              :percentage="Math.round(h.confidence * 100)"
              :stroke-width="4"
              :show-text="false"
            />
            <span v-if="h.suggestion" class="hp-sugg">{{ h.suggestion }}</span>
          </div>
          <div v-if="!highlights.length" class="hp-empty">没有识别到重点，换个文本试试</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="importing" @click="importAll">
        全部导入日程表（{{ draftSchedules.length }}）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hp {
  display: flex;
  gap: 18px;
  min-height: 320px;
}
.hp-left {
  flex: 6;
  min-width: 0;
}
.hp-right {
  flex: 4;
  min-width: 0;
  border-left: 1px solid var(--cf-line);
  padding-left: 18px;
}
.hp-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cf-text-2);
  margin-bottom: 10px;
}
.hp-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: var(--cf-text);
  white-space: pre-wrap;
}
.hp-text span {
  border-radius: 3px;
  padding: 1px 0;
}
.hp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
}
.hp-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid #eef1f5;
  border-radius: 10px;
}
.hp-type {
  align-self: flex-start;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 6px;
}
.hp-item-text {
  font-size: 13px;
  color: var(--cf-text);
}
.hp-sugg {
  font-size: 12px;
  color: var(--cf-accent);
}
.hp-empty {
  font-size: 12px;
  color: var(--cf-text-3);
  padding: 20px 0;
  text-align: center;
}
</style>
