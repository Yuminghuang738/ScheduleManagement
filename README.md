# ChronoFlow 智能日程管理应用

把散落的日程信息变成一张自动整理好的智能日程表。支持**桌面端（Electron）+ 移动端（Capacitor）双端**，同一套 Vue3 界面复用。

## 双端架构

```
                        Vue3 渲染层（共用一份界面代码）
        ┌───────────────────────────┬───────────────────────────┐
        │  桌面端                    │  移动端                    │
        │  window.appApi            │  window.appApi            │
        │  ← Electron preload       │  ← Capacitor bridge        │
        │  ← IPC → 主进程           │  ← 直接调用                │
        └─────────────┬─────────────┴─────────────┬─────────────┘
                      │         src/core/          │
                      │   schedule.ts（8 函数）     │
                      │   search-agent.ts（2 函数）│
                      └────────────────────────────┘
```

**核心思路**：业务逻辑抽到 `src/core/`（纯 TypeScript，不依赖任何平台），两端的「壳」各一个，界面层完全无感知。

| 端 | 壳 | 桥接方式 |
|---|---|---|
| 桌面 | `src/electron/` | IPC（preload → 主进程） |
| 移动 | `src/mobile/` | 直接调用 core（无 IPC） |

## 目录结构

| 目录 | 一句话 |
|---|---|
| `src/core/` | 双端通用业务逻辑（schedule + search-agent） |
| `src/electron/` | 桌面壳：主进程 + preload |
| `src/mobile/` | 手机桥：Capacitor bridge |
| `src/renderer/` | Vue3 界面（双端共用） |
| `src/shared/` | 冻结契约：types / ipc / config / api / mock |

## 快速开始

```bash
npm install

# 桌面端（Electron）—— 默认 Mock 模式，直接跑即可看到演示数据
npm run dev

# 移动端（浏览器预览，需先装 Capacitor）
npm run dev:mobile
```

## 打包

```bash
# 桌面端安装包
npm run build:win    # Windows
npm run build:linux  # Linux

# 移动端 App
npm run cap:add:android   # 生成 Android 工程（首次）
npm run cap:sync          # 同步构建产物到原生工程
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `MOCK_MODE` | **默认开启**（不设置即为 Mock）。显式设为 `false` 时走真实逻辑，需自备 AI/搜索 Key |
