<script setup lang="ts">
/**
 * 划重点预览弹窗（P3 实现）
 *
 *   - 高亮显示原文片段（HighlightSegment）
 *   - 显示每条片段的类型 + confidence
 *   - 一键把 draftSchedules 转入日程表
 *
 * 额外兼容「智能生成时间表」结果（kind === 'generate'）：展示生成说明 / 冲突警告 / 结构化表格，
 * 复用同一个弹窗，避免 App.vue 挂载两个弹窗。
 */
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { ScheduleItem } from '../../shared/types';
import { useScheduleStore } from '../hooks/useScheduleStore';
import {
  PRIORITY_META,
  buildHighlightParts,
  formatScheduleRange,
  highlightColor,
  highlightLabel,
  type HighlightPart,
} from '../utils/format';

const store = useScheduleStore();
const { state } = store;

const importing = ref(false);
const selectedKeys = ref<string[]>([]);

const visible = computed(() => state.preview !== null);
const payload = computed(() => state.preview);
const isHighlight = computed(() => payload.value?.kind === 'highlight');

/** 草稿行：附上稳定的 key，便于勾选 */
const draftRows = computed(() =>
  (payload.value?.draftSchedules ?? []).map((item, idx) => ({
    key: item.id || `draft_${idx}`,
    item,
  })),
);

const parts = computed<HighlightPart[]>(() => {
  if (!payload.value || payload.value.kind !== 'highlight') return [];
  return buildHighlightParts(payload.value.fullText, payload.value.highlights);
});

const segments = computed(() => payload.value?.highlights ?? []);

// 弹窗打开时默认全选所有草稿
watch(
  () => state.preview,
  (p) => {
    selectedKeys.value = p ? p.draftSchedules.map((s, i) => s.id || `draft_${i}`) : [];
  },
  { immediate: true },
);

const allSelected = computed(
  () => draftRows.value.length > 0 && selectedKeys.value.length === draftRows.value.length,
);

function toggleAll(checked: boolean) {
  selectedKeys.value = checked ? draftRows.value.map((r) => r.key) : [];
}

function toggleOne(key: string, checked: boolean) {
  selectedKeys.value = checked
    ? [...new Set([...selectedKeys.value, key])]
    : selectedKeys.value.filter((k) => k !== key);
}

/** el-checkbox change 事件：值为 boolean（或 indeterminate 场景下的 'indeterminate'） */
function onAllChange(v: unknown) {
  toggleAll(v === true);
}

function onOneChange(key: string, v: unknown) {
  toggleOne(key, v === true);
}

/** el-dialog 关闭时清理预览态 */
function onDialogVisible(v: boolean) {
  if (!v) close();
}

function partStyle(part: HighlightPart) {
  if (!part.type) return {};
  const color = highlightColor(part.type);
  return {
    background: `${color}22`,
    borderBottom: `2px solid ${color}`,
    color: '#2b3646',
  };
}

function partTitle(part: HighlightPart): string | undefined {
  if (!part.type) return undefined;
  return `${highlightLabel(part.type)} · 置信度 ${Math.round((part.confidence ?? 0) * 100)}%`;
}

function confidencePct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

const legendTypes = computed(() => {
  const set = new Set(segments.value.map((s) => s.type));
  return [...set];
});

function close() {
  store.closePreview();
}

async function handleImport() {
  const rows = draftRows.value.filter((r) => selectedKeys.value.includes(r.key));
  if (!rows.length) {
    ElMessage.warning('请至少勾选一条要转入的日程');
    return;
  }
  importing.value = true;
  try {
    const ok = await store.importDrafts(rows.map((r) => r.item as ScheduleItem));
    if (ok > 0) ElMessage.success(`已导入 ${ok} 条日程到日程表`);
    else ElMessage.error('导入失败，请稍后重试');
    close();
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="payload?.title || '预览'"
    width="760px"
    top="7vh"
    class="highlight-dialog"
    @update:model-value="onDialogVisible"
  >
    <div v-if="payload" class="preview-body">
      <!-- ========== 划重点模式：原文高亮 ========== -->
      <template v-if="isHighlight">
        <div class="block-title">
          <span>原文片段</span>
          <div v-if="legendTypes.length" class="legend">
            <span v-for="t in legendTypes" :key="t" class="legend-item">
              <i class="legend-dot" :style="{ background: highlightColor(t) }" />
              {{ highlightLabel(t) }}
            </span>
          </div>
        </div>
        <div class="origin-text">
          <span
            v-for="(part, i) in parts"
            :key="i"
            :style="partStyle(part)"
            :title="partTitle(part)"
            :class="{ 'hl-part': !!part.type }"
          >{{ part.text }}</span>
        </div>

        <div class="block-title">
          <span>识别到的重点（{{ segments.length }}）</span>
        </div>
        <ul class="segment-list">
          <li v-for="(seg, i) in segments" :key="i" class="segment-item">
            <span class="seg-type" :style="{ color: highlightColor(seg.type), borderColor: highlightColor(seg.type) }">
              {{ highlightLabel(seg.type) }}
            </span>
            <div class="seg-body">
              <p class="seg-text">{{ seg.text }}</p>
              <div class="seg-meta">
                <div class="confidence">
                  <div class="confidence-bar">
                    <i :style="{ width: `${confidencePct(seg.confidence)}%`, background: highlightColor(seg.type) }" />
                  </div>
                  <span class="confidence-num">{{ confidencePct(seg.confidence) }}%</span>
                </div>
                <span v-if="seg.suggestion" class="seg-suggestion">{{ seg.suggestion }}</span>
              </div>
            </div>
          </li>
          <li v-if="!segments.length" class="empty-line">未识别到可高亮的重点片段</li>
        </ul>
      </template>

      <!-- ========== 生成模式：说明 + 冲突 + 表格 ========== -->
      <template v-else>
        <el-alert
          v-if="payload.explanation"
          :title="payload.explanation"
          type="info"
          :closable="false"
          show-icon
          class="gen-alert"
        />
        <el-alert
          v-for="(conflict, i) in payload.conflicts"
          :key="`c-${i}`"
          :title="conflict"
          type="warning"
          :closable="false"
          show-icon
          class="gen-alert"
        />
        <div class="block-title"><span>日程草稿（{{ draftRows.length }}）</span></div>
      </template>

      <!-- ========== 草稿清单（两种模式共用） ========== -->
      <div class="draft-head">
        <span class="draft-count">将转入 {{ draftRows.length }} 条日程</span>
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="selectedKeys.length > 0 && !allSelected"
          @change="onAllChange"
        >
          全选
        </el-checkbox>
      </div>

      <div class="draft-list">
        <el-empty v-if="!draftRows.length" description="没有可导入的日程草稿" :image-size="64" />
        <div
          v-for="row in draftRows"
          :key="row.key"
          class="draft-card"
          :class="{ checked: selectedKeys.includes(row.key) }"
          @click="onOneChange(row.key, !selectedKeys.includes(row.key))"
        >
          <el-checkbox
            :model-value="selectedKeys.includes(row.key)"
            @click.stop
            @change="onOneChange(row.key, $event)"
          />
          <div class="draft-main">
            <div class="draft-title">
              <span class="color-dot" :style="{ background: row.item.color }" />
              {{ row.item.title }}
              <el-tag :type="PRIORITY_META[row.item.priority].tag" size="small" effect="light" round>
                {{ PRIORITY_META[row.item.priority].label }}
              </el-tag>
            </div>
            <div class="draft-meta">{{ formatScheduleRange(row.item) }}</div>
            <div v-if="row.item.location || row.item.contact" class="draft-meta">
              <span v-if="row.item.location">📍 {{ row.item.location }}</span>
              <span v-if="row.item.contact"> 👤 {{ row.item.contact }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="importing" :disabled="!draftRows.length" @click="handleImport">
        转入日程表
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.preview-body {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.block-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #2b3646;
  margin: 4px 0 8px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 400;
  color: #8c98a8;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.origin-text {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7f9fd;
  border: 1px solid #e8eef8;
  font-size: 13px;
  line-height: 2;
  color: #4a5768;
  white-space: pre-wrap;
  word-break: break-all;
}
.hl-part {
  border-radius: 3px;
  padding: 1px 2px;
  cursor: help;
}

.segment-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.segment-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #eef1f7;
  border-radius: 10px;
  background: #fff;
}
.seg-type {
  flex-shrink: 0;
  height: 20px;
  line-height: 18px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: #fff;
}
.seg-body {
  min-width: 0;
  flex: 1;
}
.seg-text {
  margin: 0;
  font-size: 12px;
  color: #4a5768;
  line-height: 1.6;
  word-break: break-all;
}
.seg-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}
.confidence {
  display: flex;
  align-items: center;
  gap: 6px;
}
.confidence-bar {
  width: 90px;
  height: 5px;
  border-radius: 3px;
  background: #eef1f7;
  overflow: hidden;
}
.confidence-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.confidence-num {
  font-size: 11px;
  color: #8c98a8;
}
.seg-suggestion {
  font-size: 11px;
  color: #4f8cff;
}
.empty-line {
  font-size: 12px;
  color: #a6b1c2;
  text-align: center;
  padding: 8px 0;
}

.gen-alert {
  margin-bottom: 8px;
}

.draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 2px 6px;
  margin-top: 4px;
  border-top: 1px dashed #eef2f8;
}
.draft-count {
  font-size: 13px;
  font-weight: 600;
  color: #2b3646;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.draft-card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #eef1f7;
  border-radius: 10px;
  background: #fafbfe;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;
}
.draft-card.checked {
  border-color: #bcd4ff;
  background: #f2f7ff;
}
.draft-main {
  min-width: 0;
  flex: 1;
}
.draft-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2b3646;
  word-break: break-all;
}
.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.draft-meta {
  margin-top: 3px;
  font-size: 12px;
  color: #8c98a8;
}
</style>
