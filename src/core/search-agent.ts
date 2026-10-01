/**
 * 内嵌全网多平台智能搜索 Agent（双端通用）
 *
 * 独立子模块，提供搜索 + 摘要能力。
 * 本模块不依赖 Electron 或 Capacitor，纯 TypeScript 逻辑。
 *
 * 骨架说明：
 *   - MOCK_MODE=true   → 返回 3~5 条样例结果
 *   - MOCK_MODE=false  → 抛出 NOT_IMPLEMENTED
 *
 * 实现说明：
 *   shared/mock.ts 在这里只提供「可检索语料」，检索本身的逻辑全部在本文件内完成。
 *   multiPlatformQuery：关键词抽取 → title/snippet 模糊匹配 → sources 过滤 → limit 截断
 *   getSummary       ：复用 multiPlatformQuery，snippet 拼成 summary，title 作为 keyPoints，
 *                      搜索结果本身即 references
 *
 * 内部服务：不通过 IPC 暴露给渲染进程（见 shared/ipc.ts 注释）。
 */

import type { Result, SearchRequest, SearchResultItem, SearchSummaryRes } from '../shared/types';
import { MOCK_MODE } from '../shared/config';
import { mockSearchData, NOT_IMPLEMENTED } from '../shared/mock';

/** req.limit 缺省（或非法）时的最大返回条数 */
const DEFAULT_LIMIT = 5;

/** 拉丁/数字词元的最小长度，避免 "a"、"1" 这类噪声词元 */
const MIN_LATIN_TOKEN_LEN = 2;

/** 中文 bigram 滑窗长度 */
const CJK_GRAM = 2;

/**
 * 归一化：小写 + 去掉空白与标点符号，让中英文可以无缝子串匹配。
 * 例："3F 会议室 A" → "3f会议室a"
 */
function normalize(text: string): string {
  return (text ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

/**
 * 从查询串中抽取可用于检索的词元。
 *
 * 搜索场景的 query 往往是一整段自然语言（例如 schedule.ts 直接把用户原文传进来），
 * 因此不能拿整串去做子串匹配，需要先切成词元再按「命中数」排序：
 *   - 拉丁字母/数字串：整段取出，需含字母且长度 ≥ 2（"Q4" → "q4"，纯数字如 "10:00" 丢弃）
 *   - 汉字串：按 2 字滑窗切 bigram（"会议室" → ["会议", "议室"]）
 *   - 仅当整个查询就是一个孤立的汉字时，才保留这个单字（否则单字命中噪声太大）
 */
function extractKeywords(query: string): string[] {
  const raw = (query ?? '').toLowerCase();
  const tokens: string[] = [];

  for (const m of raw.matchAll(/[a-z0-9]+/g)) {
    const token = m[0];
    if (token.length >= MIN_LATIN_TOKEN_LEN && /[a-z]/.test(token)) tokens.push(token);
  }

  const cjkOnly = raw.replace(/[^\u4e00-\u9fa5]/g, '');
  for (const m of raw.matchAll(/[\u4e00-\u9fa5]+/g)) {
    const seg = m[0];
    if (seg.length < CJK_GRAM) {
      if (cjkOnly === seg) tokens.push(seg);
      continue;
    }
    for (let i = 0; i + CJK_GRAM <= seg.length; i++) {
      tokens.push(seg.slice(i, i + CJK_GRAM));
    }
  }

  return Array.from(new Set(tokens));
}

/** 单条结果的相关度得分：命中词元长度之和（bigram 记 2 分，拉丁词按长度记分） */
function relevanceOf(item: SearchResultItem, keywords: string[]): number {
  const haystack = normalize(`${item.title} ${item.snippet}`);
  let score = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += keyword.length;
  }
  return score;
}

/** 解析返回条数：非法/缺省一律回落到 DEFAULT_LIMIT */
function resolveLimit(limit?: number): number {
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0
    ? Math.floor(limit)
    : DEFAULT_LIMIT;
}

// ==================== 能力 1：多平台搜索 ====================

export async function multiPlatformQuery(req: SearchRequest): Promise<Result<SearchResultItem[]>> {
  if (!MOCK_MODE) {
    throw NOT_IMPLEMENTED;
  }

  // 1) 语料：来自统一 mock 数据源（只读，不改 shared/mock.ts）
  const corpus = mockSearchData.multiPlatformQuery(req);

  // 2) sources 过滤：未指定时返回全部来源
  let candidates = corpus;
  if (req.sources && req.sources.length > 0) {
    const allowed = new Set(req.sources);
    candidates = candidates.filter((item) => allowed.has(item.source));
  }

  // 3) 关键词模糊匹配 title / snippet；无可用关键词时不做过滤
  const keywords = extractKeywords(req.query);
  let matched = candidates;
  if (keywords.length > 0) {
    matched = candidates
      .map((item, index) => ({ item, index, score: relevanceOf(item, keywords) }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index) // 相关度降序，同分保持原顺序
      .map((hit) => hit.item);
  }

  // 4) 按 limit 截断（缺省 5 条）
  return { success: true, data: matched.slice(0, resolveLimit(req.limit)) };
}

// ==================== 能力 2：智能摘要 ====================

export async function getSummary(req: SearchRequest): Promise<Result<SearchSummaryRes>> {
  if (!MOCK_MODE) {
    throw NOT_IMPLEMENTED;
  }

  // 摘要建立在搜索结果之上，直接复用上面那条链路，保证两者口径一致
  const searchRes = await multiPlatformQuery(req);
  const references = searchRes.data ?? [];

  const snippets = Array.from(
    new Set(references.map((item) => item.snippet.trim()).filter(Boolean)),
  );
  const summary = snippets.length > 0
    ? snippets.join(' ')
    : `未检索到与「${req.query}」相关的参考信息。`;

  const keyPoints = Array.from(
    new Set(references.map((item) => item.title.trim()).filter(Boolean)),
  );

  return { success: true, data: { summary, keyPoints, references } };
}
