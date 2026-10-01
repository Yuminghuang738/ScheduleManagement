/**
 * ChronoFlow 统一 API 封装（双端通用）
 *
 * 桌面端走 Electron IPC（window.appApi → preload → 主进程）
 * 手机端走 Capacitor Bridge（window.appApi → core/ 直接调用）
 *
 * 渲染层组件不需要关心当前在哪个平台，只管调 useAppApi()。
 */

import type {
  GenScheduleTableReq, GenScheduleTableRes,
  ExtractHighlightsReq, ExtractHighlightsRes,
  SaveInfoReq, ClassifiedItem,
  QueryClassifiedReq, ClassifiedQueryRes,
  ScheduleInput, ScheduleItem,
  ScheduleQueryReq, ScheduleQueryRes,
} from '../../shared/types';
import type { ScheduleApi } from '../../shared/api';

declare global {
  interface Window {
    appApi: ScheduleApi;
  }
}

async function call<T>(action: () => Promise<{ success: boolean; data?: T; error?: { message: string } }>): Promise<T> {
  const res = await action();
  if (!res.success) {
    alert(res.error?.message || '操作失败');
    throw new Error(res.error?.message || '操作失败');
  }
  return res.data as T;
}

export function useAppApi() {
  const api = window.appApi;
  if (!api) {
    throw new Error('appApi 未初始化，请确认 preload（桌面端）或 registerMobileBridge（手机端）已执行');
  }
  return {
    genTableFromText: (req: GenScheduleTableReq) =>
      call(() => api.genTableFromText(req)),
    extractHighlights: (req: ExtractHighlightsReq) =>
      call(() => api.extractHighlights(req)),
    saveClassifiedInfo: (req: SaveInfoReq) =>
      call(() => api.saveClassifiedInfo(req)),
    queryClassifiedItems: (req: QueryClassifiedReq) =>
      call(() => api.queryClassifiedItems(req)),
    create: (input: ScheduleInput) =>
      call(() => api.create(input)),
    update: (item: ScheduleItem) =>
      call(() => api.update(item)),
    delete: (id: string) =>
      call(() => api.delete(id)),
    query: (req: ScheduleQueryReq) =>
      call(() => api.query(req)),
  };
}