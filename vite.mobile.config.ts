/**
 * ChronoFlow 移动端（Capacitor）Vite 配置
 *
 * 与桌面端共用同一套 Vue3 界面，入口不同：
 *   - 桌面端：src/renderer/main.ts（走 Electron preload 的 window.appApi）
 *   - 移动端：src/renderer/main-mobile.ts（走 registerMobileBridge 的 window.appApi）
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@core': resolve(__dirname, 'src/core'),
      '@mobile': resolve(__dirname, 'src/mobile'),
      '@ctrl/tinycolor': resolve(__dirname, 'node_modules/@ctrl/tinycolor/dist/module/public_api.js'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist-mobile'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index-mobile.html'),
    },
  },
});
