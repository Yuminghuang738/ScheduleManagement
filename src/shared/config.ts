// ============================================================
// ChronoFlow 全局开关
// ============================================================
// 默认开启 Mock（演示/开发模式的兜底）：
//   - 不设置 MOCK_MODE        → Mock 开启（Windows 下无需配环境变量）
//   - MOCK_MODE=false         → 关闭 Mock，走真实业务逻辑
// 变更说明（2026-10-01）：由「必须显式设为 true」改为「默认开启」，
// 原因：Windows cmd/PowerShell 无法用 `MOCK_MODE=true npm run dev` 传参，
// 导致界面空白。演示时不需要任何配置即可跑通全链路。

export const MOCK_MODE = process.env.MOCK_MODE !== 'false';
