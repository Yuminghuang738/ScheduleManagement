# ChronoFlow 模块签名契约（冻结）

> 路径已按双端架构更新：`src/core/` 为双端通用业务逻辑，`src/electron/` 为桌面壳，`src/mobile/` 为手机桥。

## 双端通用核心层（src/core/）

```ts
// src/core/schedule.ts —— 日程主模块（纯 TS，不依赖 Electron/Capacitor）
export async function genTableFromText(req: GenScheduleTableReq): Promise<Result<GenScheduleTableRes>>;
export async function extractHighlights(req: ExtractHighlightsReq): Promise<Result<ExtractHighlightsRes>>;
export async function saveClassifiedInfo(req: SaveInfoReq): Promise<Result<ClassifiedItem>>;
export async function queryClassifiedItems(req: QueryClassifiedReq): Promise<Result<ClassifiedQueryRes>>;
export async function createSchedule(input: ScheduleInput): Promise<Result<ScheduleItem>>;
export async function updateSchedule(item: ScheduleItem): Promise<Result<ScheduleItem>>;
export async function deleteSchedule(id: string): Promise<Result<boolean>>;
export async function querySchedule(req: ScheduleQueryReq): Promise<Result<ScheduleQueryRes>>;

// src/core/search-agent.ts —— 内嵌搜索 Agent（纯 TS）
export async function multiPlatformQuery(req: SearchRequest): Promise<Result<SearchResultItem[]>>;
export async function getSummary(req: SearchRequest): Promise<Result<SearchSummaryRes>>;
```

## 桌面端壳（src/electron/）

```ts
// src/electron/index.ts —— 主进程：创建窗口 + 注册全部 IPC handler
// src/electron/preload.ts —— 通过 contextBridge 暴露 window.appApi: ScheduleApi（8 方法，不含 search:*）
```

## 移动端桥（src/mobile/）

```ts
// src/mobile/bridge.ts —— 把 core/ 函数直接挂到 window.appApi（手机端无 IPC）
export const mobileAppApi: ScheduleApi;
export function registerMobileBridge(): void;
```

## 渲染进程（src/renderer/）

```ts
// src/renderer/hooks/useAppApi.ts —— 双端通用，只管调 window.appApi 的 8 个方法
// src/renderer/main.ts —— 桌面端入口（Electron preload 注入 appApi）
// src/renderer/main-mobile.ts —— 移动端入口（先 registerMobileBridge 再 mount）
```
