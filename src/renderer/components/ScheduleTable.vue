<script setup lang="ts">
/**
 * 日程表主视图（P3 实现）
 *
 *   - 表格展示日程（时间 / 标题 / 优先级 / 标签 / 颜色 / 地点 / 联系人 / 完成状态）
 *   - 新增 / 编辑日程 → 弹窗表单
 *   - 删除日程 → 二次确认弹窗
 *   - 勾选完成 → 更新 isCompleted，标题划线
 *   - 粘贴文本 → genTableFromText / extractHighlights → 弹出划重点预览
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Priority, ScheduleInput, ScheduleItem } from '../../shared/types';
import { useAppApi } from '../hooks/useAppApi';
import { useScheduleStore } from '../hooks/useScheduleStore';
import { PRIORITY_META, PRIORITY_OPTIONS, formatScheduleRange } from '../utils/format';

const api = useAppApi();
const store = useScheduleStore();
const { state } = store;

/** el-table 插槽的 row 为 any，统一走这里取优先级展示元数据 */
function priorityMeta(p: Priority) {
  return PRIORITY_META[p] ?? PRIORITY_META.medium;
}

onMounted(() => {
  store.refresh();
});

// ==================== 文本 → 日程 ====================
const pasteText = ref('');
const generating = ref(false);
const extracting = ref(false);

function readPasteText(): string | null {
  const text = pasteText.value.trim();
  if (!text) {
    ElMessage.warning('请先粘贴一段待整理的文本');
    return null;
  }
  return text;
}

/** 智能生成时间表：文字 → 结构化日程（走 genTableFromText） */
async function handleGenerate() {
  const text = readPasteText();
  if (!text) return;
  generating.value = true;
  try {
    const res = await api.genTableFromText({
      text,
      baseDate: new Date().toISOString(),
      timezone: 'Asia/Shanghai',
    });
    store.openPreview({
      kind: 'generate',
      title: '智能生成时间表',
      sourceText: text,
      fullText: text,
      highlights: [],
      draftSchedules: res.scheduleItems ?? [],
      explanation: res.explanation,
      conflicts: res.conflicts ?? [],
    });
  } catch {
    /* useAppApi 已提示 */
  } finally {
    generating.value = false;
  }
}

/** 文本划重点：抽取 HighlightSegment + 日程草稿（走 extractHighlights） */
async function handleExtract() {
  const text = readPasteText();
  if (!text) return;
  extracting.value = true;
  try {
    const res = await api.extractHighlights({ text });
    store.openPreview({
      kind: 'highlight',
      title: '文本划重点',
      sourceText: text,
      fullText: res.fullText || text,
      highlights: res.highlights ?? [],
      draftSchedules: res.draftSchedules ?? [],
    });
  } catch {
    /* useAppApi 已提示 */
  } finally {
    extracting.value = false;
  }
}

// ==================== 新增 / 编辑 ====================
const dialogVisible = ref(false);
const submitting = ref(false);
const editingBase = ref<ScheduleItem | null>(null);

const form = reactive({
  title: '',
  description: '',
  timeRange: [] as string[],
  isAllDay: false,
  priority: 'medium' as Priority,
  tags: [] as string[],
  color: '#4f8cff',
  location: '',
  contact: '',
});

const dialogTitle = computed(() => (editingBase.value ? '编辑日程' : '新增日程'));

const rules = {
  title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
  timeRange: [{ required: true, message: '请选择开始 / 结束时间', trigger: 'change' }],
};

function resetForm() {
  form.title = '';
  form.description = '';
  form.timeRange = [];
  form.isAllDay = false;
  form.priority = 'medium';
  form.tags = [];
  form.color = '#4f8cff';
  form.location = '';
  form.contact = '';
}

function openCreate() {
  editingBase.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: ScheduleItem) {
  editingBase.value = row;
  form.title = row.title;
  form.description = row.description;
  form.timeRange = [row.startTime.slice(0, 19), row.endTime.slice(0, 19)];
  form.isAllDay = row.isAllDay;
  form.priority = row.priority;
  form.tags = [...row.tags];
  form.color = row.color;
  form.location = row.location;
  form.contact = row.contact;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题');
    return;
  }
  if (!form.timeRange || form.timeRange.length !== 2) {
    ElMessage.warning('请选择开始 / 结束时间');
    return;
  }

  const input: ScheduleInput = {
    title: form.title.trim(),
    description: form.description.trim(),
    startTime: form.timeRange[0],
    endTime: form.timeRange[1],
    isAllDay: form.isAllDay,
    priority: form.priority,
    tags: form.tags,
    color: form.color,
    location: form.location.trim(),
    contact: form.contact.trim(),
  };

  submitting.value = true;
  try {
    if (editingBase.value) {
      const payload: ScheduleItem = {
        ...editingBase.value,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        priority: input.priority ?? 'medium',
        tags: input.tags ?? [],
        color: input.color ?? '#4f8cff',
        location: input.location ?? '',
        contact: input.contact ?? '',
      };
      await store.updateSchedule(payload);
      ElMessage.success('日程已更新');
    } else {
      await store.createSchedule(input);
      ElMessage.success('日程已创建');
    }
    dialogVisible.value = false;
  } finally {
    submitting.value = false;
  }
}

// ==================== 删除 / 完成 ====================
async function handleDelete(row: ScheduleItem) {
  try {
    await ElMessageBox.confirm(`确定删除日程「${row.title}」吗？该操作不可撤销。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    });
  } catch {
    return;
  }
  const ok = await store.deleteSchedule(row.id);
  if (ok) ElMessage.success('已删除');
}

async function handleToggleComplete(row: ScheduleItem) {
  await store.toggleComplete(row);
}
</script>

<template>
  <div class="schedule-table">
    <header class="table-head">
      <div class="head-text">
        <h2>我的日程表</h2>
        <p>共 {{ state.schedules.length }} 条日程，点标题前勾选框可标记完成</p>
      </div>
      <el-button type="primary" @click="openCreate">＋ 新增日程</el-button>
    </header>

    <!-- 粘贴文本 → 智能生成 / 划重点 -->
    <section class="paste-zone">
      <el-input
        v-model="pasteText"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="把零散的日程信息粘进来，例如：下周五上午 10:00-11:30 在 3F 会议室 A 评审 Q4 产品路线图；10 月 8 号前务必把 Q3 述职交了……"
      />
      <div class="paste-actions">
        <span class="paste-hint">支持一段话里包含多件事，自动拆分成多条日程</span>
        <div class="paste-buttons">
          <el-button :loading="extracting" @click="handleExtract">✎ 划重点</el-button>
          <el-button type="primary" :loading="generating" @click="handleGenerate">⚡ 智能生成时间表</el-button>
        </div>
      </div>
    </section>

    <!-- 过滤 -->
    <section class="filter-bar">
      <el-input
        v-model="state.query.keyword"
        class="filter-keyword"
        placeholder="搜索标题 / 描述"
        clearable
        @keyup.enter="store.refresh()"
        @clear="store.refresh()"
      />
      <el-select
        v-model="state.query.priority"
        class="filter-priority"
        placeholder="全部优先级"
        clearable
        @change="store.refresh()"
      >
        <el-option v-for="opt in PRIORITY_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
      <el-checkbox v-model="state.query.onlyUncompleted" @change="store.refresh()">仅看未完成</el-checkbox>
      <el-button link type="primary" @click="store.refresh()">刷新</el-button>
    </section>

    <!-- 表格 -->
    <section class="table-wrap">
      <el-table
        v-loading="state.loading"
        :data="state.schedules"
        row-key="id"
        height="100%"
        :header-cell-style="{ background: '#f5f7fb', color: '#5d6b7f', fontWeight: 600 }"
      >
        <el-table-column width="52" align="center">
          <template #header>
            <span class="col-done">完成</span>
          </template>
          <template #default="{ row }">
            <el-checkbox
              :model-value="row.isCompleted"
              @change="() => handleToggleComplete(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="时间" width="230">
          <template #default="{ row }">
            <span class="cell-time">{{ formatScheduleRange(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="标题" min-width="260">
          <template #default="{ row }">
            <div class="cell-title-wrap">
              <span class="color-dot" :style="{ background: row.color }" />
              <div class="cell-title-body">
                <div class="cell-title" :class="{ 'is-done': row.isCompleted }">
                  {{ row.title }}
                  <el-tag v-if="row.isAllDay" size="small" effect="plain" type="success" round>全天</el-tag>
                </div>
                <div v-if="row.description" class="cell-desc">{{ row.description }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="priorityMeta(row.priority).tag" size="small" effect="light" round>
              {{ priorityMeta(row.priority).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="标签" min-width="140">
          <template #default="{ row }">
            <template v-if="row.tags?.length">
              <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain" class="tag-item">
                {{ tag }}
              </el-tag>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column label="地点 / 联系人" min-width="150">
          <template #default="{ row }">
            <div v-if="row.location" class="meta-line">📍 {{ row.location }}</div>
            <div v-if="row.contact" class="meta-line">👤 {{ row.contact }}</div>
            <span v-if="!row.location && !row.contact" class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="132" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无日程，粘贴一段文本试试智能生成" :image-size="80" />
        </template>
      </el-table>
    </section>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" label-width="88px" label-position="right">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="60" show-word-limit placeholder="请输入日程标题" />
        </el-form-item>

        <el-form-item label="时间" prop="timeRange">
          <el-date-picker
            v-model="form.timeRange"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="全天">
          <el-switch v-model="form.isAllDay" />
        </el-form-item>

        <el-form-item label="优先级">
          <el-radio-group v-model="form.priority">
            <el-radio-button v-for="opt in PRIORITY_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="回车创建标签"
            style="width: 100%"
          >
            <el-option v-for="tag in form.tags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="颜色">
          <el-color-picker v-model="form.color" />
        </el-form-item>

        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="如：3F 会议室 A" />
        </el-form-item>

        <el-form-item label="联系人">
          <el-input v-model="form.contact" placeholder="如：王经理" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.schedule-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 20px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e8ecf3;
  overflow: hidden;
}

.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.head-text h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2933;
}
.head-text p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8c98a8;
}

.paste-zone {
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  background: #f7f9fd;
  border: 1px dashed #dbe3f0;
}
.paste-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}
.paste-hint {
  font-size: 12px;
  color: #98a4b6;
}
.paste-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0 10px;
}
.filter-keyword {
  width: 240px;
}
.filter-priority {
  width: 140px;
}

.table-wrap {
  flex: 1;
  min-height: 200px;
}

.col-done {
  font-size: 12px;
}

.cell-time {
  font-size: 12px;
  color: #4a5768;
}

.cell-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.cell-title-body {
  min-width: 0;
}
.cell-title {
  font-size: 13px;
  font-weight: 600;
  color: #2b3646;
  display: flex;
  align-items: center;
  gap: 6px;
  word-break: break-all;
}
.cell-title.is-done {
  text-decoration: line-through;
  color: #a6b1c2;
  font-weight: 500;
}
.cell-desc {
  margin-top: 3px;
  font-size: 12px;
  color: #98a4b6;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tag-item {
  margin: 0 4px 4px 0;
}
.meta-line {
  font-size: 12px;
  color: #5d6b7f;
  line-height: 1.6;
}
.muted {
  color: #c2cad6;
}
</style>