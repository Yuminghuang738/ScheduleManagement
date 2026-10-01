// src/main/schedule.ts
export async function genTableFromText(req: GenScheduleTableReq): Promise<Result<GenScheduleTableRes>>;
export async function extractHighlights(req: ExtractHighlightsReq): Promise<Result<ExtractHighlightsRes>>;
export async function saveClassifiedInfo(req: SaveInfoReq): Promise<Result<ClassifiedItem>>;
export async function queryClassifiedItems(req: QueryClassifiedReq): Promise<Result<ClassifiedQueryRes>>;
export async function createSchedule(input: ScheduleInput): Promise<Result<ScheduleItem>>;
export async function updateSchedule(item: ScheduleItem): Promise<Result<ScheduleItem>>;
export async function deleteSchedule(id: string): Promise<Result<boolean>>;
export async function querySchedule(req: ScheduleQueryReq): Promise<Result<ScheduleQueryRes>>;

// src/main/search-agent.ts
export async function multiPlatformQuery(req: SearchRequest): Promise<Result<SearchResultItem[]>>;
export async function getSummary(req: SearchRequest): Promise<Result<SearchSummaryRes>>;

// src/preload/app-preload.ts
// 通过 contextBridge 暴露 window.appApi: ScheduleApi（8 个方法，不含 search:*）

// src/renderer/hooks/useAppApi.ts
// 调用 window.appApi 的 8 个方法，统一处理 success:false