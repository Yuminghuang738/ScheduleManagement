<script setup lang="ts">
/**
 * 划重点预览弹窗（Task 4）
 *
 * Props：visible / highlights / draftSchedules / fullText
 * Emits：close / imported
 *
 * - 左栏(60%)：原文全文，按 highlight 的 startOffset~endOffset 高亮（六类配色）
 * - 右栏(40%)：每条 highlight → 类型标签 + 文本 + 置信度(ElProgress) + suggestion
 * - 底部「全部导入日程表」：逐条 create → ElMessage.success → emit('imported') → emit('close')
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

/* ---------- 类型标签 / 高亮配色（Task4 规范，六类） ---------- */
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

/* ---------- 把全文切成高亮片段（事件端点扫描，天然支持重叠） ---------- */
interface Seg {
  text: string;
  type: HighlightType | null;
}

const segments = computed<Seg[]>(() => {
  const text = props.fullText || '';
  const n = text.length;
  if (!n) return [];

  // 构建每个字符位置上的「当前高亮类型」标记（重叠时取最后命中的）
  const typeAt: (HighlightType | null)[] = new Array(n).fill(null);
  for (const h of props.highlights) {
    const s = Math.max(0, Math.min(h.startOffset, n));
    const e = Math.max(0, Math.min(h.endOffset, n));
    for (let i = s; i < e; i++) typeAt[i] = h.type;
  }

  // 相邻同类型字符合并成一个片段
  const out: Seg[] = [];
  let i = 0;
  while (i < n) {
    const t = typeAt[i];
    let j = i + 1;
    while (j < n && typeAt[j] === t) j++;
    out.push({ text: text.slice(i, j), type: t });
    i = j;
  }
  return out;
});

/* ---------- 置信度百分比 ---------- */
function pct(h: HighlightSegment): number {
  return Math.round((h.confidence || 0) * 100);
}

/* ---------- 一键导入 ---------- */
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
    :close-on-click-modal="false"
    @update:model-value="v => !v && !importing && emit('close')"
  >
    <div class="hp">
      <div class="hp-left">
        <div class="hp-block-title">原文</div>
        <p v-if="fullText" class="hp-text">
          <span
            v-for="(seg, i) in segments"
            :key="i"
            :class="{ hl: seg.type }"
            :style="seg.type ? { background: TYPE_COLOR[seg.type] } : {}"
          >{{ seg.text }}</span>
        </p>
        <p v-else class="hp-empty-text">暂无原文内容</p>
      </div>

      <div class="hp-right">
        <div class="hp-block-title">识别到的重点（{{ highlights.length }}）</div>
        <div class="hp-list">
          <div v-for="(h, i) in highlights" :key="i" class="hp-item">
            <div class="hp-item-head">
              <span class="hp-type" :style="{ background: TYPE_COLOR[h.type] }">
                {{ TYPE_TEXT[h.type] ?? h.type }}
              </span>
              <span class="hp-conf">{{ pct(h) }}%</span>
            </div>
            <span class="hp-item-text">{{ h.text }}</span>
            <el-progress
              :percentage="pct(h)"
              :stroke-width="4"
              :show-text="false"
              :color="h.confidence >= 0.7 ? '#0d9488' : '#f59e0b'"
            />
            <span v-if="h.suggestion" class="hp-sugg">💡 {{ h.suggestion }}</span>
          </div>
          <div v-if="!highlights.length" class="hp-empty">没有识别到重点，换个文本试试</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button :disabled="importing" @click="emit('close')">取消</el-button>
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
  flex: 6; /* 60% */
  min-width: 0;
}
.hp-right {
  flex: 4; /* 40% */
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
  word-break: break-word;
}
.hp-text span {
  border-radius: 3px;
  padding: 1px 1px;
}
.hp-empty-text {
  margin: 0;
  font-size: 13px;
  color: var(--cf-text-3);
}
.hp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 2px;
}
.hp-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px 12px;
  border: 1px solid #eef1f5;
  border-radius: 10px;
}
.hp-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hp-type {
  font-size: 11px;
  padding: 1px 9px;
  border-radius: 6px;
}
.hp-conf {
  font-size: 12px;
  color: var(--cf-text-3);
  font-variant-numeric: tabular-nums;
}
.hp-item-text {
  font-size: 13px;
  color: var(--cf-text);
  line-height: 1.5;
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
