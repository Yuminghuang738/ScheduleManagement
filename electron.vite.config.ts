import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'src/electron/index.ts'),
        formats: ['cjs']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'src/electron/preload.ts'),
        formats: ['cjs']
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [vue()],
    // 把 Mock 开关注入渲染层（构建期读取环境变量，与 shared/config.ts 的默认逻辑保持一致）
    define: {
      __MOCK_MODE__: JSON.stringify(process.env.MOCK_MODE !== 'false')
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      emptyOutDir: true
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@core': resolve(__dirname, 'src/core'),
        '@mobile': resolve(__dirname, 'src/mobile'),
        '@ctrl/tinycolor': resolve(__dirname, 'node_modules/@ctrl/tinycolor/dist/module/public_api.js')
      }
    }
  }
})