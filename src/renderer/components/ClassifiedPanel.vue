<script setup lang="ts">
/**
 * 分类信息面板
 *
 * - 输入内容 → 保存 → 自动分类（schedule:saveClassifiedInfo）
 * - 关键词搜索已归档内容（schedule:queryClassifiedItems）
 * - 类型彩色徽标 + 相对时间，安静的信息流
 */
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useAppApi } from '../hooks/useAppApi';
import type { ClassifiedItem, ClassifiedType } from '../../shared/types';

const api = useAppApi();

const input = ref('');
const keyword = ref('');
const items = ref<ClassifiedItem[]>([]);
const loading = ref(false);

const typeText: Record<ClassifiedType, string> = {
  schedule: '日程',
  reference: '参考',
  contact: '联系人',
  note: '笔记',
};

/* ---------- 搜索（防抖 300ms） ---------- */
let timer: ReturnType<typeof setTimeout> | undefined;
watch(keyword, () => {
  clearTimeout(timer);
  timer = setTimeout(() => load(), 300);
});
onUnmounted(() => clearTimeout(timer));

async function load() {
  loading.value = true;
  try {
    const kw = keyword.value.trim();
    const res = await api.queryClassifiedItems(kw ? { keyword: kw } : {});
    items.value = res.items;
  } catch {
    // 错误提示已在 useAppApi 统一弹出
  } finally {
    loading.value = false;
  }
}

async function save() {
  const content = input.value.trim();
  if (!content) {
    ElMessage.warning('先输入点内容');
    return;
  }
  const res = await api.saveClassifiedInfo({ content });
  ElMessage.success(`已归档为「${typeText[res.type] ?? res.type}」`);
  input.value = '';
  await load();
}

/* ---------- 相对时间 ---------- */
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

onMounted(load);
</script>

<template>
  <div class="cp">
    <header class="cp-head">
      <h3>信息收纳</h3>
      <span v-if="items.length" class="count">{{ items.length }}</span>
    </header>
    <p class="cp-sub">粘贴零散信息，自动分类归档</p>

    <div class="composer">
      <el-input
        v-model="input"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 6 }"
        placeholder="粘贴一段日程、联系人或备忘…"
        @keydown.ctrl.enter="save"
      />
      <div class="composer-foot">
        <span class="hint">Ctrl + Enter 快速保存</span>
        <el-button type="primary" size="small" @click="save">保存并分类</el-button>
      </div>
    </div>

    <div class="search">
      <el-input
        v-model="keyword"
        size="small"
        clearable
        placeholder="搜索已归档…"
        :prefix-icon="Search"
      />
    </div>

    <div class="list" v-loading="loading">
      <article v-for="it in items" :key="it.title + it.createdAt" class="card">
        <div class="card-head">
          <span class="type-chip" :class="it.type">
            <i />{{ typeText[it.type] ?? it.type }}
          </span>
          <span class="card-title">{{ it.title }}</span>
        </div>
        <p class="card-content">{{ it.content }}</p>
        <div class="card-foot">
          <span v-for="t in it.tags" :key="t" class="tag">{{ t }}</span>
          <span class="time">{{ relTime(it.createdAt) }}</span>
        </div>
      </article>

      <div v-if="!loading && items.length === 0" class="empty">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#c9d0dc"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <p>{{ keyword ? '没有匹配的归档' : '还没有归档内容' }}</p>
        <p class="empty-s">{{ keyword ? '换个关键词试试' : '在上方粘贴一段文字试试' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cp {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 16px 12px;
  min-height: 0;
}

.cp-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cp-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.count {
  font-size: 11px;
  color: var(--cf-text-3);
  background: #f0f2f7;
  border-radius: 10px;
  padding: 1px 7px;
}
.cp-sub {
  margin: 4px 0 14px;
  font-size: 12px;
  color: var(--cf-text-3);
}

/* ---------- 输入区 ---------- */
.composer :deep(.el-textarea__inner) {
  background: #fafbfd;
  border-color: #e9edf3;
}
.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.hint {
  font-size: 11px;
  color: var(--cf-text-3);
}

/* ---------- 搜索 ---------- */
.search {
  margin-top: 14px;
}

/* ---------- 列表 ---------- */
.list {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.card {
  border: 1px solid #eef1f5;
  border-radius: 10px;
  padding: 10px 12px;
  transition: border-color 0.15s, background 0.15s;
}
.card:hover {
  border-color: #e2e7ef;
  background: #fbfcfe;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.card-title {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-content {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--cf-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-foot {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag {
  font-size: 11px;
  color: #5d6678;
  background: #f0f2f7;
  padding: 1px 7px;
  border-radius: 6px;
}
.time {
  margin-left: auto;
  font-size: 11px;
  color: var(--cf-text-3);
}

/* 类型徽标：同色系弱底 + 色点 */
.type-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 1px 8px 1px 6px;
  border-radius: 6px;
}
.type-chip i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.type-chip.schedule {
  color: #4c6bf5;
  background: #eef1fe;
}
.type-chip.reference {
  color: #0e9f6e;
  background: #e7f7f0;
}
.type-chip.contact {
  color: #b26e00;
  background: #f9f1dd;
}
.type-chip.note {
  color: #66708a;
  background: #f0f2f7;
}

/* ---------- 空状态 ---------- */
.empty {
  padding: 34px 0 26px;
  text-align: center;
  color: var(--cf-text-3);
  font-size: 12px;
}
.empty p {
  margin: 10px 0 0;
  color: var(--cf-text-2);
}
.empty .empty-s {
  margin: 4px 0 0;
  color: var(--cf-text-3);
  font-size: 11px;
}
</style>
