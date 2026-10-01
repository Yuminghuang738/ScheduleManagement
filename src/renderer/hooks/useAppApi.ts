/**
 * ChronoFlow 渲染进程 API 统一封装
 *
 * 统一处理 Result<T>：success 时返回 data，失败时弹错误提示。
 * 禁止在组件里直接 window.appApi.xxx()，必须通过这里调用。
 */

import type { ScheduleApi } from '../../shared/api';
import type {
  GenScheduleTableReq, GenScheduleTableRes,
  ExtractHighlightsReq, ExtractHighlightsRes,
  SaveInfoReq, ClassifiedItem,
  QueryClassifiedReq, ClassifiedQueryRes,
  ScheduleInput, ScheduleItem,
  ScheduleQueryReq, ScheduleQueryRes,
} from '../../shared/types';

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
  return {
    genTableFromText: (req: GenScheduleTableReq) =>
      call(() => window.appApi.genTableFromText(req)),

    extractHighlights: (req: ExtractHighlightsReq) =>
      call(() => window.appApi.extractHighlights(req)),

    saveClassifiedInfo: (req: SaveInfoReq) =>
      call(() => window.appApi.saveClassifiedInfo(req)),

    queryClassifiedItems: (req: QueryClassifiedReq) =>
      call(() => window.appApi.queryClassifiedItems(req)),

    create: (input: ScheduleInput) =>
      call(() => window.appApi.create(input)),

    update: (item: ScheduleItem) =>
      call(() => window.appApi.update(item)),

    delete: (id: string) =>
      call(() => window.appApi.delete(id)),

    query: (req: ScheduleQueryReq) =>
      call(() => window.appApi.query(req)),
  };
}