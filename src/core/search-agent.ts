/**
 * 内嵌全网多平台智能搜索 Agent（双端通用）
 *
 * 独立子模块，提供搜索 + 摘要能力。
 * 本模块不依赖 Electron 或 Capacitor，纯 TypeScript 逻辑。
 *
 * 骨架说明：
 *   - MOCK_MODE=true   → 返回 3~5 条样例结果
 *   - MOCK_MODE=false  → 抛出 NOT_IMPLEMENTED
 */

import type { Result, SearchRequest, SearchResultItem, SearchSummaryRes } from '../shared/types';
import { MOCK_MODE } from '../shared/config';
import { mockSearchData, NOT_IMPLEMENTED } from '../shared/mock';

export async function multiPlatformQuery(req: SearchRequest): Promise<Result<SearchResultItem[]>> {
  if (MOCK_MODE) {
    return { success: true, data: mockSearchData.multiPlatformQuery(req) };
  }
  throw NOT_IMPLEMENTED;
}

export async function getSummary(req: SearchRequest): Promise<Result<SearchSummaryRes>> {
  if (MOCK_MODE) {
    return { success: true, data: mockSearchData.getSummary(req) };
  }
  throw NOT_IMPLEMENTED;
}