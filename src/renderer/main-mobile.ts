/**
 * ChronoFlow 移动端入口（Capacitor）
 *
 * 与桌面端 main.ts 共用同一套 Vue3 界面，
 * 差异只在启动时注册 mobileBridge。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles.css'
import App from './App.vue'
import { registerMobileBridge } from '../mobile/bridge'

// 手机端：注册 Capacitor 桥
registerMobileBridge()

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.mount('#app')