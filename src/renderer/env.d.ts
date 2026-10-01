/// <reference types="vite/client" />

/** Mock 模式开关，由 electron-vite 的 define 在构建期注入（与 shared/config.ts 逻辑一致） */
declare const __MOCK_MODE__: boolean

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}