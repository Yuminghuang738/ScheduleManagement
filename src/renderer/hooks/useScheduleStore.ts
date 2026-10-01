/**
 * ChronoFlow 渲染层轻量共享 Store
 *
 * 作用：App.vue 只是「壳」，真正的跨组件协调（日程列表、划重点预览弹窗状态、
 * 草稿导入）收敛到这里，避免 ScheduleTable / HighlightPreviewModal 之间硬耦合。
 *
 * 约定：所有后端能力一律通过 useAppApi 调用（内含 Result 统一处理），
 *       组件内不直接触碰 window.appApi。
 */

import { reactive } from 'vue';
import type {
  HighlightSegment,
  Priority,
  ScheduleInput,
  ScheduleItem,
} from '../../shared/types';
import { useAppApi } from './useAppApi';

/** 预览弹窗载荷：划重点 / 智能生成 两种来源共用同一个弹窗 */
export interface PreviewPayload {
  kind: 'highlight' | 'generate';
  title: string;
  sourceText: string;
  fullText: string;
  highlights: HighlightSegment[];
  draftSchedules: ScheduleItem[];
  explanation?: string;
  conflicts?: string[];
}

export interface ScheduleQueryState {
  keyword: string;
  priority?: Priority;
  onlyUncompleted: boolean;
}

interface ScheduleStoreState {
  schedules: ScheduleItem[];
  loading: boolean;
  ready: boolean;
  query: ScheduleQueryState;
  preview: PreviewPayload | null;
}

const state = reactive<ScheduleStoreState>({
  schedules: [],
  loading: false,
  ready: false,
  query: { keyword: '', priority: undefined, onlyUncompleted: false },
  preview: null,
});

/** 按开始时间升序，全天/即将发生的排前面 */
function sortSchedules(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.startTime).getTime() || 0;
    const tb = new Date(b.startTime).getTime() || 0;
    return ta - tb;
  });
}

async function refresh(): Promise<void> {
  const api = useAppApi();
  state.loading = true;
  try {
    const res = await api.query({
      keyword: state.query.keyword.trim() || undefined,
      priority: state.query.priority,
      isCompleted: state.query.onlyUncompleted ? false : undefined,
    });
    state.schedules = sortSchedules(res.items ?? []);
    state.ready = true;
  } catch {
    // useAppApi 已弹提示，这里只需保证 UI 不卡在 loading
  } finally {
    state.loading = false;
  }
}

function scheduleToInput(item: ScheduleItem): ScheduleInput {
  return {
    title: item.title,
    description: item.description,
    startTime: item.startTime,
    endTime: item.endTime,
    isAllDay: item.isAllDay,
    priority: item.priority,
    tags: item.tags,
    color: item.color,
    location: item.location,
    contact: item.contact,
  };
}

const actions = {
  refresh,

  async createSchedule(input: ScheduleInput): Promise<ScheduleItem | null> {
    const api = useAppApi();
    try {
      const item = await api.create(input);
      await refresh();
      return item;
    } catch {
      return null;
    }
  },

  async updateSchedule(item: ScheduleItem): Promise<ScheduleItem | null> {
    const api = useAppApi();
    try {
      const saved = await api.update(item);
      await refresh();
      return saved;
    } catch {
      return null;
    }
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const api = useAppApi();
    try {
      await api.delete(id);
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  async toggleComplete(item: ScheduleItem): Promise<void> {
    await actions.updateSchedule({ ...item, isCompleted: !item.isCompleted });
  },

  openPreview(payload: PreviewPayload): void {
    state.preview = payload;
  },

  closePreview(): void {
    state.preview = null;
  },

  /** 把选中的草稿写入日程表，返回成功条数 */
  async importDrafts(items: ScheduleItem[]): Promise<number> {
    if (!items.length) return 0;
    const api = useAppApi();
    let ok = 0;
    for (const item of items) {
      try {
        await api.create(scheduleToInput(item));
        ok += 1;
      } catch {
        // 单条失败继续导入其余条目
      }
    }
    if (ok > 0) await refresh();
    return ok;
  },
};

export function useScheduleStore() {
  return { state, ...actions };
}
