<script setup lang="ts">
/**
 * 日程主视图 —— 清单卡片样式（Task 3）
 *
 * 功能：
 * - 顶部文本输入 + 「生成日程」：调 extractHighlights → emit('open-highlight', {...})
 * - 任务行：圆角方形勾选框 + 彩色元信息，紧急/高优先级左侧色条
 * - 新建 / 编辑（点击行）弹窗，字段齐全（含颜色 color-picker）
 * - 删除二次确认、完成勾选、挂载自动加载
 *
 * 视觉：马尔斯绿主色头图 + 近 7 天日程量曲线 + 完成度 + 悬浮 FAB
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAppApi } from '../hooks/useAppApi';
import type {
  ScheduleItem,
  Priority,
  ExtractHighlightsRes,
} from '../../shared/types';

const api = useAppApi();

/* ---------- 事件：划重点预览 ---------- */
const emit = defineEmits<{
  (e: 'open-highlight', payload: ExtractHighlightsRes): void;
}>();

const schedules = ref<ScheduleItem[]>([]);
const loading = ref(false);

/* ---------- 优先级映射 ---------- */
const PRIO: Record<Priority, { text: string; color: string; tag: string }> = {
  urgent: { text: '紧急', color: '#f54a45', tag: 'danger' },
  high: { text: '高', color: '#ff8f1f', tag: 'warning' },
  medium: { text: '中', color: '#0d9488', tag: 'primary' },
  low: { text: '低', color: '#a2a9b8', tag: 'info' },
};
const prioKeys = Object.keys(PRIO) as Priority[];

/* ---------- 统计 ---------- */
const total = computed(() => schedules.value.length);
const doneCount = computed(() => schedules.value.filter(s => s.isCompleted).length);
const pctNum = computed(() =>
  total.value ? Math.round((doneCount.value / total.value) * 100) : 0
);

/* ---------- 头图：日期徽章 + 近 7 天曲线 ---------- */
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const pad = (n: number) => String(n).padStart(2, '0');

const _now = new Date();
const dateBadge = `${_now.getMonth() + 1}月${_now.getDate()}日 ${WEEK[_now.getDay()]}`;

const sparkPath = computed(() => {
  const days = 7;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const counts: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    counts.push(schedules.value.filter(s => s.startTime.slice(0, 10) === key).length);
  }
  const max = Math.max(...counts, 1);
  const W = 120, H = 36, P = 4;
  const pts = counts.map((v, i) => [
    P + (i * (W - P * 2)) / (days - 1),
    H - P - (v / max) * (H - P * 2),
  ] as [number, number]);
  if (!pts.length) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
});

/* ---------- 按天分组 ---------- */
function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  const base = `${m}月${d}日 ${WEEK[date.getDay()]}`;
  if (diff === 0) return `今天 · ${base}`;
  if (diff === 1) return `明天 · ${base}`;
  if (diff === -1) return `昨天 · ${base}`;
  return base;
}

interface DayGroup {
  key: string;
  label: string;
  items: ScheduleItem[];
}

const groups = computed<DayGroup[]>(() => {
  const sorted = [...schedules.value].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const map = new Map<string, ScheduleItem[]>();
  for (const s of sorted) {
    const key = s.startTime.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: dayLabel(key),
    items: items.sort(
      (a, b) =>
        Number(b.isAllDay) - Number(a.isAllDay) ||
        a.startTime.localeCompare(b.startTime)
    ),
  }));
});

function timeHM(iso: string): string {
  return iso.slice(11, 16);
}

/* ---------- 数据加载与操作 ---------- */
async function load() {
  loading.value = true;
  try {
    const res = await api.query({});
    // 浅拷贝：mock 的 query 每次返回同一数组引用，
    // 直接赋值会因 Object.is 相等被 Vue 跳过更新，导致列表不刷新
    schedules.value = [...res.items];
  } catch {
    // 错误提示已在 useAppApi 统一弹出
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
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  await api.delete(item.id);
  ElMessage.success('已删除');
  await load();
}

/* ---------- 顶部文本生成日程 ---------- */
const genText = ref('');
const generating = ref(false);

async function generate() {
  const text = genText.value.trim();
  if (!text) {
    ElMessage.warning('先粘贴一段日程文字');
    return;
  }
  generating.value = true;
  try {
    const res = await api.extractHighlights({ text });
    emit('open-highlight', res);
  } catch {
    // 错误提示已在 useAppApi 统一弹出
  } finally {
    generating.value = false;
  }
}

/* ---------- 新建 / 编辑日程 ---------- */
const dlg = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  title: '',
  description: '',
  range: null as [string, string] | null,
  isAllDay: false,
  priority: 'medium' as Priority,
  tagsText: '',
  color: '#0d9488',
  location: '',
  contact: '',
});

function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function openCreate() {
  const s = new Date();
  s.setMinutes(0, 0, 0);
  s.setHours(s.getHours() + 1);
  editingId.value = null;
  form.title = '';
  form.description = '';
  form.range = [fmtISO(s), fmtISO(new Date(s.getTime() + 3600000))];
  form.isAllDay = false;
  form.priority = 'medium';
  form.tagsText = '';
  form.color = '#0d9488';
  form.location = '';
  form.contact = '';
  dlg.value = true;
}

function openEdit(item: ScheduleItem) {
  editingId.value = item.id;
  form.title = item.title;
  form.description = item.description;
  form.range = [item.startTime, item.endTime];
  form.isAllDay = item.isAllDay;
  form.priority = item.priority;
  form.tagsText = item.tags.join('，');
  form.color = item.color || '#0d9488';
  form.location = item.location;
  form.contact = item.contact;
  dlg.value = true;
}

function splitTags(s: string): string[] {
  return s
    .split(/[,，、\s]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题');
    return;
  }
  if (!form.range || form.range.length < 2) {
    ElMessage.warning('请选择时间');
    return;
  }
  if (form.range[1] < form.range[0]) {
    ElMessage.warning('结束时间不能早于开始时间');
    return;
  }
  const input = {
    title: form.title.trim(),
    description: form.description.trim(),
    startTime: form.range[0],
    endTime: form.range[1],
    isAllDay: form.isAllDay,
    priority: form.priority,
    tags: splitTags(form.tagsText),
    color: form.color,
    location: form.location.trim(),
    contact: form.contact.trim(),
  };

  if (editingId.value) {
    // 编辑：合并回完整实体（update 契约要求 ScheduleItem）
    const origin = schedules.value.find(s => s.id === editingId.value);
    if (!origin) {
      ElMessage.error('找不到原日程');
      return;
    }
    await api.update({ ...origin, ...input });
    ElMessage.success('已保存修改');
  } else {
    await api.create(input);
    ElMessage.success('已添加到日程');
  }
  dlg.value = false;
  await load();
}

onMounted(load);

/* 暴露给父组件：导入日程后刷新 */
defineExpose({ load });
</script>

<template>
  <section class="panel">
    <!-- 头图：主色块 + 统计 -->
    <header class="hero">
      <div class="hero-main">
        <div class="hero-title">
          <h2>日程安排</h2>
          <span class="hero-date">{{ dateBadge }}</span>
        </div>
        <p class="hero-sub">
          <template v-if="total">共 {{ total }} 项 · 已完成 {{ doneCount }} · 待办 {{ total - doneCount }}</template>
          <template v-else>把要做的事安排进来</template>
        </p>
      </div>

      <div class="hero-right">
        <svg class="spark" viewBox="0 0 120 36">
          <path :d="sparkPath" fill="none" stroke="rgba(255,255,255,0.9)"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="hero-pct">
          <b>{{ pctNum }}<i>%</i></b>
          <span>完成度</span>
        </div>
      </div>

      <svg class="hero-wave" viewBox="0 0 400 80" preserveAspectRatio="none">
        <path d="M0 62 C 70 22, 150 88, 230 48 S 350 28, 400 56 L 400 80 L 0 80 Z"
              fill="rgba(255,255,255,0.10)" />
        <path d="M0 72 C 90 40, 180 92, 260 62 S 360 46, 400 68 L 400 80 L 0 80 Z"
              fill="rgba(255,255,255,0.08)" />
      </svg>
    </header>

    <!-- 顶部：文本生成日程 -->
    <div class="generator">
      <el-input
        v-model="genText"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        placeholder="粘贴一段文字，AI 帮你识别成日程，例如：下周五上午 10 点在 3F 会议室评审产品路线图…"
      />
      <el-button type="primary" class="gen-btn" :loading="generating" @click="generate">
        生成日程
      </el-button>
    </div>

    <div class="tl-scroll" v-loading="loading">
      <div v-for="g in groups" :key="g.key" class="day-group">
        <div class="day-label">{{ g.label }}<span class="day-count">{{ g.items.length }} 项</span></div>

        <article
          v-for="item in g.items"
          :key="item.id"
          class="task"
          :class="{ done: item.isCompleted, bar: item.priority === 'urgent' || item.priority === 'high' }"
          :style="{ '--c': PRIO[item.priority].color }"
          @click="openEdit(item)"
        >
          <button
            class="check"
            :class="{ on: item.isCompleted }"
            title="标记完成"
            @click.stop="toggleComplete(item)"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff"
                 stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>

          <div class="task-main">
            <div class="row1">
              <span class="color-chip" :style="{ background: item.color }" />
              <span class="title">{{ item.title }}</span>
              <el-tag size="small" :type="PRIO[item.priority].tag as any" effect="light" disable-transitions>
                {{ PRIO[item.priority].text }}
              </el-tag>
            </div>

            <div class="meta">
              <span class="meta-item time">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <template v-if="item.isAllDay">全天</template>
                <template v-else>{{ timeHM(item.startTime) }} - {{ timeHM(item.endTime) }}</template>
              </span>
              <span v-if="item.location" class="meta-item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {{ item.location }}
              </span>
              <span v-if="item.contact" class="meta-item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {{ item.contact }}
              </span>
              <span v-for="t in item.tags" :key="t" class="chip">{{ t }}</span>
            </div>

            <p v-if="item.description" class="desc">{{ item.description }}</p>
          </div>

          <button class="del" title="删除" @click.stop="remove(item)">删除</button>
        </article>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && schedules.length === 0" class="empty">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#bfd3cf"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <p class="empty-t">还没有任何安排</p>
        <p class="empty-s">在上方粘贴一段文字生成日程，或点击右下角 ＋ 手动新建</p>
      </div>
    </div>

    <!-- 悬浮新建按钮 -->
    <button class="fab" title="新建日程" @click="openCreate">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff"
           stroke-width="2.4" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>

    <!-- 新建 / 编辑日程 -->
    <el-dialog v-model="dlg" :title="editingId ? '编辑日程' : '新建日程'" width="520px">
      <el-form label-width="72px" label-position="left">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="例如：周五下午 产品评审会" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选" maxlength="200" />
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="form.range"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            start-placeholder="开始"
            end-placeholder="结束"
            :disabled="form.isAllDay"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="全天">
          <el-switch v-model="form.isAllDay" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option v-for="k in prioKeys" :key="k" :value="k" :label="PRIO[k].text" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tagsText" placeholder="用逗号/空格分隔，如：工作, 重要" maxlength="100" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="可选" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" placeholder="可选" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" @click="submit">{{ editingId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ---------- 头图 ---------- */
.hero {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  background: linear-gradient(118deg, #14a396 0%, #0b857c 100%);
  color: #fff;
  overflow: hidden;
}
.hero-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hero-title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.hero-date {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.18);
  padding: 2px 9px;
  border-radius: 7px;
}
.hero-sub {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}
.hero-right {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}
.spark {
  width: 118px;
  height: 36px;
  overflow: visible;
}
.hero-pct {
  text-align: right;
}
.hero-pct b {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hero-pct b i {
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
  margin-left: 1px;
}
.hero-pct span {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
}
.hero-wave {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 58%;
  height: 100%;
  pointer-events: none;
}

/* ---------- 生成区 ---------- */
.generator {
  flex: none;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px 18px;
  border-bottom: 1px solid var(--cf-line);
}
.generator :deep(.el-textarea) {
  flex: 1;
}
.gen-btn {
  flex: none;
  margin-top: 2px;
}

/* ---------- 列表 ---------- */
.tl-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 88px;
}
.day-group {
  margin-bottom: 20px;
}
.day-group:last-child {
  margin-bottom: 0;
}
.day-label {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--cf-accent);
  background: var(--cf-accent-soft);
  padding: 3px 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.day-count {
  margin-left: 7px;
  font-weight: 400;
  color: var(--cf-text-3);
}

/* 任务行：白卡片，点击进入编辑 */
.task {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 11px 14px;
  box-shadow: 0 1px 2px rgba(23, 43, 40, 0.06);
  transition: box-shadow 0.15s;
  overflow: hidden;
  cursor: pointer;
}
.task + .task {
  margin-top: 9px;
}
.task:hover {
  box-shadow: 0 4px 14px rgba(23, 43, 40, 0.1);
}
.task::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--c);
}
.task:not(.bar)::before {
  display: none;
}

.check {
  width: 17px;
  height: 17px;
  flex: none;
  margin-top: 2px;
  border-radius: 5px;
  border: 1.5px solid #c3d4d0;
  background: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
}
.check:hover {
  border-color: var(--cf-accent);
}
.check.on {
  background: var(--cf-accent);
  border-color: var(--cf-accent);
}

.task-main {
  flex: 1;
  min-width: 0;
}
.row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-chip {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.title {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 12px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--cf-text-3);
}
.meta-item.time {
  color: var(--cf-accent);
  font-weight: 500;
}
.chip {
  font-size: 11px;
  color: #5d6678;
  background: #f0f2f7;
  padding: 1px 8px;
  border-radius: 6px;
}
.desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--cf-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.del {
  flex: none;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--cf-text-3);
  cursor: pointer;
  opacity: 0;
  padding: 2px 0 2px 6px;
  margin-top: 2px;
  transition: opacity 0.15s, color 0.15s;
}
.task:hover .del {
  opacity: 1;
}
.del:hover {
  color: var(--cf-danger);
}

.task.done {
  opacity: 0.55;
}
.task.done .title {
  text-decoration: line-through;
  text-decoration-color: rgba(102, 112, 138, 0.6);
}

/* ---------- FAB ---------- */
.fab {
  position: absolute;
  right: 22px;
  bottom: 22px;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #14a396, #0b857c);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(13, 148, 136, 0.38);
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 2;
}
.fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(13, 148, 136, 0.46);
}
.fab:active {
  transform: translateY(0);
}

/* ---------- 空状态 ---------- */
.empty {
  padding: 56px 0 64px;
  text-align: center;
}
.empty-t {
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--cf-text-2);
}
.empty-s {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--cf-text-3);
}
</style>
