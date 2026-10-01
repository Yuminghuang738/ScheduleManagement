/**
 * ChronoFlow Capacitor 配置
 *
 * 把 Vue3 界面打包成 iOS/Android 原生 App。
 * webDir 指向移动端构建产物。
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chronoflow.app',
  appName: 'ChronoFlow',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
  },
};

export default config;
