<script setup lang="ts">
/**
 * 日程表主视图（最小可运行版）
 *
 * 现在能做的：
 *   - 挂载时调 useAppApi().query() 拉取 mock 日程
 *   - 用 Element Plus 表格展示
 *   - 完成勾选、删除
 *
 * 后续 P3 在此基础上加：粘贴文本生成日程、编辑弹窗、划重点预览等。
 */
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAppApi } from '../hooks/useAppApi';
import type { ScheduleItem } from '../../shared/types';

const api = useAppApi();

const schedules = ref<ScheduleItem[]>([]);
const loading = ref(false);

const priorityText: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const priorityType: Record<string, string> = {
  low: 'info',
  medium: '',
  high: 'warning',
  urgent: 'danger',
};

async function load() {
  loading.value = true;
  try {
    const res = await api.query({});
    schedules.value = res.items;
  } catch (e) {
    // 错误已在 useAppApi 里弹过提示
  } finally {
    loading.value = false;
  }
}

async function toggleComplete(item: ScheduleItem) {
  await api.update({ ...item, isCompleted: !item.isCompleted });
  await load();
}

async function remove(item: ScheduleItem) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.title}」吗？`, '删除确认', {
      type: 'warning',
    });
  } catch {
    return; // 用户取消
  }
  await api.delete(item.id);
  ElMessage.success('已删除');
  await load();
}

function fmtTime(t: string) {
  return t.replace('T', ' ').slice(0, 16);
}

onMounted(load);
</script>

<template>
  <div class="schedule-table">
    <el-table :data="schedules" v-loading="loading" stripe border>
      <el-table-column label="时间" width="150">
        <template #default="{ row }">
          <span v-if="row.isAllDay">全天</span>
          <span v-else>{{ fmtTime(row.startTime) }} ~ {{ fmtTime(row.endTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <el-tag :type="priorityType[row.priority]" size="small">
            {{ priorityText[row.priority] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标签" width="160">
        <template #default="{ row }">
          <el-tag
            v-for="t in row.tags"
            :key="t"
            size="small"
            type="info"
            style="margin-right: 4px"
          >
            {{ t }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="颜色" width="70" align="center">
        <template #default="{ row }">
          <span
            class="color-dot"
            :style="{ background: row.color }"
          />
        </template>
      </el-table-column>
      <el-table-column prop="location" label="地点" width="120" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column label="完成" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox
            :model-value="row.isCompleted"
            @change="toggleComplete(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="center">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="remove(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && schedules.length === 0" description="暂无日程" />
  </div>
</template>

<style scoped>
.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

:deep(.is-completed) {
  text-decoration: line-through;
  opacity: 0.5;
}
</style>
