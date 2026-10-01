<script setup lang="ts">
/**
 * 分类信息面板（最小可运行版）
 *
 * 现在能做的：
 *   - 输入内容 → 保存 → 自动分类（调 saveClassifiedInfo）
 *   - 列出已分类信息（调 queryClassifiedItems）
 *
 * 后续 P4 在此基础上加：分类筛选、分页等。
 */
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useAppApi } from '../hooks/useAppApi';
import type { ClassifiedItem } from '../../shared/types';

const api = useAppApi();

const input = ref('');
const items = ref<ClassifiedItem[]>([]);
const loading = ref(false);

const typeText: Record<string, string> = {
  schedule: '日程',
  reference: '参考',
  contact: '联系人',
  note: '笔记',
};

const typeColor: Record<string, string> = {
  schedule: '#409eff',
  reference: '#e6a23c',
  contact: '#67c23a',
  note: '#909399',
};

async function load() {
  loading.value = true;
  try {
    const res = await api.queryClassifiedItems({});
    items.value = res.items;
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
  ElMessage.success(`已归类为：${typeText[res.type]}`);
  input.value = '';
  await load();
}

onMounted(load);
</script>

<template>
  <div class="classified-panel">
    <h3 class="panel-title">信息收纳</h3>

    <div class="input-row">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        placeholder="粘贴一段零散信息，自动分类保存"
      />
      <el-button type="primary" style="margin-top: 8px" @click="save">
        保存
      </el-button>
    </div>

    <div class="item-list" v-loading="loading">
      <div v-for="item in items" :key="item.title + item.createdAt" class="item">
        <span class="item-type" :style="{ color: typeColor[item.type] }">
          {{ typeText[item.type] }}
        </span>
        <span class="item-title">{{ item.title }}</span>
        <p class="item-content">{{ item.content }}</p>
      </div>

      <el-empty
        v-if="!loading && items.length === 0"
        description="还没有分类信息"
        :image-size="60"
      />
    </div>
  </div>
</template>

<style scoped>
.classified-panel {
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.input-row {
  margin-bottom: 16px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
}

.item-type {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
}

.item-title {
  font-size: 14px;
  color: #303133;
}

.item-content {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 0;
}
</style>
