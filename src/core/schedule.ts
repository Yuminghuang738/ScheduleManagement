/**
 * ChronoFlow 日程主模块（双端通用）
 *
 * 实现三大核心能力 + 日程 CRUD：
 *   1. genTableFromText —— 输入文字，智能生成时间表
 *   2. extractHighlights —— 文本划重点，提取候选日程
 *   3. saveClassifiedInfo / queryClassifiedItems —— 零散信息自动分类存储
 *   4. create / update / delete / query —— 日程增删改查
 *
 * 本模块不依赖 Electron 或 Capacitor，纯 TypeScript 逻辑。
 * 骨架说明：
 *   - MOCK_MODE=true   → 走 mock 分支
 *   - MOCK_MODE=false  → 抛出 NOT_IMPLEMENTED
 */

import type {
  Result,
  GenScheduleTableReq, GenScheduleTableRes,
  ExtractHighlightsReq, ExtractHighlightsRes,
  SaveInfoReq, ClassifiedItem,
  QueryClassifiedReq, ClassifiedQueryRes,
  ScheduleInput, ScheduleItem, ScheduleQueryReq, ScheduleQueryRes,
} from '../shared/types';
import { MOCK_MODE } from '../shared/config';
import { mockScheduleData, NOT_IMPLEMENTED } from '../shared/mock';
import { multiPlatformQuery } from './search-agent';

// ==================== 核心能力 1：文本生成时间表 ====================

export async function genTableFromText(req: GenScheduleTableReq): Promise<Result<GenScheduleTableRes>> {
  if (MOCK_MODE) {
    // 调搜索 Agent 获取参考信息
    const searchRes = await multiPlatformQuery({ query: req.text });
    const refCount = searchRes.data?.length ?? 0;
    const mockData = mockScheduleData.genTableFromText(req);
    return {
      success: true,
      data: {
        ...mockData,
        explanation: `${mockData.explanation}（搜索 Agent 返回 ${refCount} 条参考）`,
      },
    };
  }
  throw NOT_IMPLEMENTED;
}

// ==================== 核心能力 2：智能划重点 ====================

export async function extractHighlights(req: ExtractHighlightsReq): Promise<Result<ExtractHighlightsRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.extractHighlights(req) };
  }
  throw NOT_IMPLEMENTED;
}

// ==================== 核心能力 3：智能分类存储 ====================

export async function saveClassifiedInfo(req: SaveInfoReq): Promise<Result<ClassifiedItem>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.saveClassifiedInfo(req) };
  }
  throw NOT_IMPLEMENTED;
}

export async function queryClassifiedItems(req: QueryClassifiedReq): Promise<Result<ClassifiedQueryRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.queryClassifiedItems(req) };
  }
  throw NOT_IMPLEMENTED;
}

// ==================== 日程 CRUD ====================

export async function createSchedule(input: ScheduleInput): Promise<Result<ScheduleItem>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.create(input) };
  }
  throw NOT_IMPLEMENTED;
}

export async function updateSchedule(item: ScheduleItem): Promise<Result<ScheduleItem>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.update(item) };
  }
  throw NOT_IMPLEMENTED;
}

export async function deleteSchedule(id: string): Promise<Result<boolean>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.delete(id) };
  }
  throw NOT_IMPLEMENTED;
}

export async function querySchedule(req: ScheduleQueryReq): Promise<Result<ScheduleQueryRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.query(req) };
  }
  throw NOT_IMPLEMENTED;
}