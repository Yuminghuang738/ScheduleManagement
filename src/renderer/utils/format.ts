/**
 * 渲染层展示工具：优先级 / 高亮类型 / 分类类型 的文案与配色，
 * 以及 ISO8601 时间的人性化格式化。只做「展示」，不承载业务逻辑。
 */

import type {
  ClassifiedType,
  HighlightType,
  Priority,
  ScheduleItem,
} from '../../shared/types';

// ==================== 优先级 ====================

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; tag: 'info' | 'primary' | 'warning' | 'danger' }
> = {
  low: { label: '低', color: '#8c98a8', tag: 'info' },
  medium: { label: '中', color: '#4f8cff', tag: 'primary' },
  high: { label: '高', color: '#e6a23c', tag: 'warning' },
  urgent: { label: '紧急', color: '#f56c6c', tag: 'danger' },
};

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_META) as Priority[]).map((value) => ({
  value,
  label: PRIORITY_META[value].label,
}));

// ==================== 划重点类型 ====================

export const HIGHLIGHT_TYPE_META: Record<HighlightType, { label: string; color: string }> = {
  task: { label: '待办', color: '#4f8cff' },
  deadline: { label: '截止', color: '#f56c6c' },
  event: { label: '事件', color: '#37b26c' },
  contact: { label: '联系人', color: '#e6a23c' },
  location: { label: '地点', color: '#8c98a8' },
  reminder: { label: '提醒', color: '#9b59b6' },
};

export function highlightLabel(type: HighlightType): string {
  return HIGHLIGHT_TYPE_META[type]?.label ?? type;
}

export function highlightColor(type: HighlightType): string {
  return HIGHLIGHT_TYPE_META[type]?.color ?? '#8c98a8';
}

// ==================== 分类信息类型 ====================

/**
 * 文案与配色取自 Task 5 契约（ClassifiedPanel）：
 *   「日程 / 参考 / 联系人 / 备注」+ schedule #4f8cff、reference #10b981、
 *   contact #8b5cf6、note #f39c12 —— 这四个色值是需求约定值，不要改成"更好看"的近似色。
 */
export const CLASSIFIED_TYPE_META: Record<ClassifiedType, { label: string; color: string }> = {
  schedule: { label: '日程', color: '#4f8cff' },
  reference: { label: '参考', color: '#10b981' },
  contact: { label: '联系人', color: '#8b5cf6' },
  note: { label: '备注', color: '#f39c12' },
};

export const CLASSIFIED_TYPE_OPTIONS = (
  Object.keys(CLASSIFIED_TYPE_META) as ClassifiedType[]
).map((value) => ({ value, label: CLASSIFIED_TYPE_META[value].label }));

export function classifiedLabel(type: ClassifiedType): string {
  return CLASSIFIED_TYPE_META[type]?.label ?? type;
}

export function classifiedColor(type: ClassifiedType): string {
  return CLASSIFIED_TYPE_META[type]?.color ?? '#8c98a8';
}

// ==================== 时间格式化 ====================

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-10-03 10:00" —— 用于表单/表格展示 */
export function formatDateTime(iso: string): string {
  const d = toDate(iso);
  if (!d) return iso || '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** "2026-10-03" */
export function formatDate(iso: string): string {
  const d = toDate(iso);
  if (!d) return iso || '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "10:00" */
export function formatTime(iso: string): string {
  const d = toDate(iso);
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 日程时间区间展示：
 *   - 全天日程        → "2026-10-01 ~ 10-07 全天"
 *   - 同一天          → "2026-10-03 10:00 - 11:30"
 *   - 跨天            → "2026-10-03 10:00 ~ 2026-10-04 12:00"
 */
export function formatScheduleRange(item: Pick<ScheduleItem, 'startTime' | 'endTime' | 'isAllDay'>): string {
  if (!item.startTime) return '—';
  if (item.isAllDay) {
    const start = formatDate(item.startTime);
    const end = item.endTime ? formatDate(item.endTime) : '';
    return end && end !== start ? `${start} ~ ${end} 全天` : `${start} 全天`;
  }
  const startDay = formatDate(item.startTime);
  const endDay = formatDate(item.endTime);
  if (startDay === endDay) {
    return `${startDay} ${formatTime(item.startTime)} - ${formatTime(item.endTime)}`;
  }
  return `${formatDateTime(item.startTime)} ~ ${formatDateTime(item.endTime)}`;
}

// ==================== 划重点原文切片 ====================

export interface HighlightPart {
  text: string;
  type?: HighlightType;
  confidence?: number;
}

/**
 * 按 HighlightSegment 的 offset 把原文切成「普通片段 / 高亮片段」。
 * 对越界或互相重叠的 segment 做容错：越界丢弃，重叠跳过。
 */
export function buildHighlightParts(
  fullText: string,
  segments: { text: string; startOffset: number; endOffset: number; type: HighlightType; confidence: number }[],
): HighlightPart[] {
  const text = fullText ?? '';
  if (!text) return [];

  const valid = segments
    .filter((s) => s.startOffset >= 0 && s.endOffset <= text.length && s.endOffset > s.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset);

  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (const s of valid) {
    if (s.startOffset < cursor) continue; // 与前一段重叠，跳过
    if (s.startOffset > cursor) parts.push({ text: text.slice(cursor, s.startOffset) });
    parts.push({ text: text.slice(s.startOffset, s.endOffset), type: s.type, confidence: s.confidence });
    cursor = s.endOffset;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}
