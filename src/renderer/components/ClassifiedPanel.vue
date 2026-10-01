<script setup lang="ts">
/**
 * 分类信息面板（P4 实现）
 *
 *   - 输入框 + 保存按钮 → saveClassifiedInfo（Toast 显示归类结果）
 *   - 按 type / keyword 查询已分类信息，分页展示
 *   - 全部通过 useAppApi 调用
 */
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { ClassifiedItem, ClassifiedType } from '../../shared/types';
import { useAppApi } from '../hooks/useAppApi';
import {
  CLASSIFIED_TYPE_OPTIONS,
  classifiedColor,
  classifiedLabel,
  formatDateTime,
} from '../utils/format';

const api = useAppApi();

// ==================== 录入 ====================
const draft = ref('');
const hintType = ref<ClassifiedType | ''>('');
const saving = ref(false);

async function handleSave() {
  const content = draft.value.trim();
  if (!content) {
    ElMessage.warning('请先输入要保存的内容');
    return;
  }
  saving.value = true;
  try {
    const item = await api.saveClassifiedInfo({
      content,
      hintType: hintType.value || undefined,
    });
    ElMessage.success({
      message: `已归类为「${classifiedLabel(item.type)}」：${item.title}`,
      duration: 2600,
    });
    draft.value = '';
    // 重新回到第一页，保证刚保存的条目可见
    page.value = 1;
    await load();
  } catch {
    /* useAppApi 已提示 */
  } finally {
    saving.value = false;
  }
}

// ==================== 查询 ====================
const keyword = ref('');
const filterType = ref<ClassifiedType | ''>('');
const page = ref(1);
const pageSize = ref(5);
const total = ref(0);
const items = ref<ClassifiedItem[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await api.queryClassifiedItems({
      keyword: keyword.value.trim() || undefined,
      type: filterType.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    items.value = res.items ?? [];
    total.value = res.pageInfo?.total ?? items.value.length;
  } catch {
    items.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  load();
}

function handleReset() {
  keyword.value = '';
  filterType.value = '';
  page.value = 1;
  load();
}

function handlePageChange(next: number) {
  page.value = next;
  load();
}

onMounted(load);
</script>

<template>
  <div class="classified-panel">
    <header class="panel-head">
      <h2>零散信息收纳</h2>
      <p>随手记一句，自动帮你归类保存</p>
    </header>

    <!-- 录入区 -->
    <section class="compose">
      <el-input
        v-model="draft"
        type="textarea"
        :rows="3"
        resize="none"
        maxlength="200"
        show-word-limit
        placeholder="例如：王经理电话 138xxxx，产品部负责人"
      />
      <div class="compose-actions">
        <el-select v-model="hintType" class="hint-select" placeholder="自动识别" clearable size="default">
          <el-option
            v-for="opt in CLASSIFIED_TYPE_OPTIONS"
            :key="opt.value"
            :label="`人工指定：${opt.label}`"
            :value="opt.value"
          />
        </el-select>
        <el-button type="primary" :loading="saving" @click="handleSave">保存并归类</el-button>
      </div>
    </section>

    <el-divider class="soft-divider" />

    <!-- 查询区 -->
    <section class="filters">
      <el-input
        v-model="keyword"
        placeholder="搜索标题 / 内容"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <span class="filter-icon">⌕</span>
        </template>
      </el-input>
      <div class="filters-row">
        <el-select v-model="filterType" placeholder="全部类型" clearable size="default" @change="handleSearch">
          <el-option
            v-for="opt in CLASSIFIED_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button @click="handleSearch">查询</el-button>
        <el-button link type="info" @click="handleReset">重置</el-button>
      </div>
    </section>

    <!-- 列表区 -->
    <section v-loading="loading" class="result-list">
      <el-empty v-if="!items.length && !loading" description="还没有保存任何信息" :image-size="72" />

      <article v-for="(item, idx) in items" :key="`${item.createdAt}-${idx}`" class="classified-card">
        <div class="card-top">
          <span class="type-tag" :style="{ color: classifiedColor(item.type), borderColor: classifiedColor(item.type) }">
            {{ classifiedLabel(item.type) }}
          </span>
          <time class="card-time">{{ formatDateTime(item.createdAt) }}</time>
        </div>
        <h3 class="card-title">{{ item.title || '（无标题）' }}</h3>
        <p class="card-content">{{ item.content }}</p>
        <div v-if="item.tags?.length" class="card-tags">
          <el-tag v-for="tag in item.tags" :key="tag" size="small" effect="plain" round>{{ tag }}</el-tag>
        </div>
      </article>
    </section>

    <!-- 分页 -->
    <footer v-if="total > 0" class="panel-foot">
      <el-pagination
        small
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
      <span class="foot-count">共 {{ total }} 条</span>
    </footer>
  </div>
</template>

<style scoped>
.classified-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 18px 12px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e8ecf3;
  overflow: hidden;
}

.panel-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2933;
}
.panel-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8c98a8;
}

.compose {
  margin-top: 14px;
}
.compose-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.hint-select {
  width: 150px;
  flex-shrink: 0;
}

.soft-divider {
  margin: 16px 0 14px;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.filters-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.filters-row :deep(.el-select) {
  width: 132px;
}
.filter-icon {
  font-size: 14px;
  color: #a6b1c2;
}

.result-list {
  flex: 1;
  min-height: 120px;
  margin-top: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.classified-card {
  border: 1px solid #edf1f7;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafbfe;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
}
.classified-card:hover {
  border-color: #d8e2f5;
  box-shadow: 0 4px 14px rgba(79, 140, 255, 0.08);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.type-tag {
  font-size: 11px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: #fff;
}
.card-time {
  font-size: 11px;
  color: #a6b1c2;
}
.card-title {
  margin: 8px 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #2b3646;
  word-break: break-all;
}
.card-content {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #5d6b7f;
  white-space: pre-wrap;
  word-break: break-all;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed #eef2f8;
}
.foot-count {
  font-size: 12px;
  color: #a6b1c2;
}
</style>
