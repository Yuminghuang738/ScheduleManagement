<script setup lang="ts">
/**
 * 日程主视图 —— 时间轴样式
 *
 * - 按天分组的时间轴（今天 / 明天 / 日期），色点沿用 item.color
 * - 完成勾选、悬停删除、新建日程（走 schedule:create 契约）
 * - Mock 模式下展示 mock.ts 里的 5 条演示日程
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAppApi } from '../hooks/useAppApi';
import type { ScheduleItem, Priority } from '../../shared/types';

const api = useAppApi();

const schedules = ref<ScheduleItem[]>([]);
const loading = ref(false);

/* ---------- 优先级映射 ---------- */
const PRIO: Record<Priority, { text: string; color: string }> = {
  urgent: { text: '紧急', color: '#f54a45' },
  high: { text: '高', color: '#ff8f1f' },
  medium: { text: '中', color: '#4c6bf5' },
  low: { text: '低', color: '#a2a9b8' },
};
const prioKeys = Object.keys(PRIO) as Priority[];

/* ---------- 统计 ---------- */
const total = computed(() => schedules.value.length);
const doneCount = computed(() => schedules.value.filter(s => s.isCompleted).length);
const pct = computed(() =>
  total.value ? `${Math.round((doneCount.value / total.value) * 100)}%` : '0%'
);

/* ---------- 按天分组 ---------- */
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
    schedules.value = res.items;
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

/* ---------- 新建日程 ---------- */
const dlg = ref(false);
const form = reactive({
  title: '',
  range: null as [string, string] | null,
  priority: 'medium' as Priority,
  location: '',
});

function fmtISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function openCreate() {
  const s = new Date();
  s.setMinutes(0, 0, 0);
  s.setHours(s.getHours() + 1);
  form.title = '';
  form.range = [fmtISO(s), fmtISO(new Date(s.getTime() + 3600000))];
  form.priority = 'medium';
  form.location = '';
  dlg.value = true;
}

async function submitCreate() {
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
  await api.create({
    title: form.title.trim(),
    description: '',
    startTime: form.range[0],
    endTime: form.range[1],
    isAllDay: false,
    priority: form.priority,
    tags: [],
    location: form.location.trim(),
  });
  dlg.value = false;
  ElMessage.success('已添加到日程');
  await load();
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <header class="head">
      <div class="head-titles">
        <h2>日程安排</h2>
        <p v-if="total" class="stat">
          共 {{ total }} 项 · 已完成 {{ doneCount }}
          <span class="bar"><i :style="{ width: pct }" /></span>
        </p>
        <p v-else class="stat">还没有安排</p>
      </div>
      <el-button type="primary" size="small" @click="openCreate">＋ 新建日程</el-button>
    </header>

    <div class="tl-scroll" v-loading="loading">
      <div v-for="g in groups" :key="g.key" class="day-group">
        <div class="day-label">{{ g.label }}<span class="day-count">{{ g.items.length }} 项</span></div>

        <article v-for="item in g.items" :key="item.id" class="tl-item">
          <div class="tl-time">
            <b v-if="item.isAllDay">全天</b>
            <template v-else>
              <b>{{ timeHM(item.startTime) }}</b>
              <i>{{ timeHM(item.endTime) }}</i>
            </template>
          </div>

          <div class="rail"><i class="dot" :style="{ background: item.color }" /></div>

          <div class="tl-card" :class="{ done: item.isCompleted }" :style="{ '--c': item.color }">
            <div class="row1">
              <button
                class="check"
                :class="{ on: item.isCompleted }"
                title="标记完成"
                @click.stop="toggleComplete(item)"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff"
                     stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
              <span class="title">{{ item.title }}</span>
              <span class="prio" :style="{ color: PRIO[item.priority].color }">
                <i :style="{ background: PRIO[item.priority].color }" />{{ PRIO[item.priority].text }}
              </span>
              <button class="del" @click.stop="remove(item)">删除</button>
            </div>

            <p v-if="item.description" class="desc">{{ item.description }}</p>

            <div class="meta">
              <span v-for="t in item.tags" :key="t" class="chip">{{ t }}</span>
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
            </div>
          </div>
        </article>
      </div>

      <!-- 空状态：克制、有引导 -->
      <div v-if="!loading && schedules.length === 0" class="empty">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#c9d0dc"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <p class="empty-t">还没有任何安排</p>
        <p class="empty-s">点击右上角「新建日程」，或在左侧粘贴一段文字让 AI 帮你排期</p>
      </div>
    </div>

    <!-- 新建日程 -->
    <el-dialog v-model="dlg" title="新建日程" width="460px">
      <el-form label-width="64px" label-position="left">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="例如：周五下午 产品评审会" maxlength="50" />
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="form.range"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            start-placeholder="开始"
            end-placeholder="结束"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option v-for="k in prioKeys" :key="k" :value="k" :label="PRIO[k].text" />
          </el-select>
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="可选" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
/* ---------- 面板头 ---------- */
.head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--cf-line);
}
.head-titles h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.stat {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cf-text-3);
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar {
  width: 64px;
  height: 4px;
  border-radius: 2px;
  background: #edf0f5;
  overflow: hidden;
  display: inline-block;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--cf-accent);
  transition: width 0.3s;
}

/* ---------- 时间轴 ---------- */
.tl-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 20px;
}
.day-group {
  margin-bottom: 20px;
}
.day-group:last-child {
  margin-bottom: 0;
}
.day-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--cf-text-2);
  margin-bottom: 10px;
}
.day-count {
  margin-left: 8px;
  font-weight: 400;
  color: var(--cf-text-3);
}

.tl-item {
  display: grid;
  grid-template-columns: 46px 18px 1fr;
  gap: 0 8px;
}
.tl-item + .tl-item {
  margin-top: 10px;
}

.tl-time {
  text-align: right;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
}
.tl-time b {
  font-size: 13px;
  font-weight: 600;
  color: var(--cf-text);
}
.tl-time i {
  font-style: normal;
  font-size: 11px;
  color: var(--cf-text-3);
}

/* 轨道：竖线 + 色点 */
.rail {
  position: relative;
}
.rail::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: #eef1f5;
}
.tl-item:first-child .rail::before {
  top: 18px;
}
.tl-item:last-child .rail::before {
  bottom: calc(100% - 18px);
}
.dot {
  position: absolute;
  left: 50%;
  top: 18px;
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(31, 36, 48, 0.08);
  z-index: 1;
}

/* 卡片 */
.tl-card {
  border: 1px solid #e9edf3;
  border-left: 3px solid var(--c);
  border-radius: 10px;
  background: #fbfcfe;
  padding: 10px 12px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.tl-card:hover {
  border-color: #dde3ec;
  box-shadow: 0 2px 10px rgba(31, 41, 55, 0.06);
}

.row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  border: 1.5px solid #cfd6e0;
  background: transparent;
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
.title {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prio {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.prio i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.del {
  flex: none;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--cf-text-3);
  cursor: pointer;
  opacity: 0;
  padding: 2px 4px;
  transition: opacity 0.15s, color 0.15s;
}
.tl-item:hover .del {
  opacity: 1;
}
.del:hover {
  color: var(--cf-danger);
}

.desc {
  margin: 6px 0 0 26px;
  font-size: 12px;
  color: var(--cf-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  margin: 7px 0 0 26px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}
.chip {
  font-size: 11px;
  color: #5d6678;
  background: #f0f2f7;
  padding: 1px 8px;
  border-radius: 6px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--cf-text-3);
}

/* 已完成态 */
.tl-card.done {
  opacity: 0.6;
}
.tl-card.done .title {
  text-decoration: line-through;
  text-decoration-color: rgba(102, 112, 138, 0.6);
}

/* ---------- 空状态 ---------- */
.empty {
  padding: 60px 0 70px;
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
