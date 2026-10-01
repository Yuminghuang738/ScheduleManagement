/**
 * ChronoFlow 日程主模块
 *
 * 实现三大核心能力 + 日程 CRUD：
 *   1. genTableFromText —— 输入文字，智能生成时间表
 *   2. extractHighlights —— 文本划重点，提取候选日程
 *   3. saveClassifiedInfo / queryClassifiedItems —— 零散信息自动分类存储
 *   4. create / update / delete / query —— 日程增删改查
 *
 * 骨架说明：
 *   - MOCK_MODE=true   → 走 mock 分支（返回 mock-data.json 样例数据）
 *   - MOCK_MODE=false  → 抛出 NOT_IMPLEMENTED，把实现代码填入 throw 位置
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
import { mockScheduleData } from '../shared/mock';
import { NOT_IMPLEMENTED } from '../shared/mock';

// ==================== 核心能力 1：文本生成时间表 ====================

export async function genTableFromText(req: GenScheduleTableReq): Promise<Result<GenScheduleTableRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockScheduleData.genTableFromText(req) };
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