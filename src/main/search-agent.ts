/**
 * 内嵌全网多平台智能搜索 Agent
 *
 * 独立子模块，提供搜索 + 摘要能力。
 * 仅通过主进程内部 import 调用（schedule.ts），绝不暴露给渲染进程。
 *
 * 骨架说明：
 *   - MOCK_MODE=true   → 返回 3~5 条样例结果
 *   - MOCK_MODE=false  → 抛出 NOT_IMPLEMENTED，把实现代码填入 throw 位置
 */

import type { Result, SearchRequest, SearchResultItem, SearchSummaryRes } from '../shared/types';
import { MOCK_MODE } from '../shared/config';
import { mockSearchData, NOT_IMPLEMENTED } from '../shared/mock';

// ==================== 多平台全网搜索 ====================

export async function multiPlatformQuery(req: SearchRequest): Promise<Result<SearchResultItem[]>> {
  if (MOCK_MODE) {
    return { success: true, data: mockSearchData.multiPlatformQuery(req) };
  }
  throw NOT_IMPLEMENTED;
}

// ==================== 搜索结果智能摘要 ====================

export async function getSummary(req: SearchRequest): Promise<Result<SearchSummaryRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockSearchData.getSummary(req) };
  }
  throw NOT_IMPLEMENTED;
}