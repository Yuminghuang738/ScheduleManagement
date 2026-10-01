/**
 * ChronoFlow Electron 主进程入口
 * 【集成工程师维护】
 *
 * 职责：
 *   1. 创建 BrowserWindow，加载 preload + 渲染页面
 *   2. 注册全部 IPC handler（schedule:* + search:* 内部）
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { IPC } from '../shared/ipc';
import {
  genTableFromText,
  extractHighlights,
  saveClassifiedInfo,
  queryClassifiedItems,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  querySchedule,
} from '../core/schedule';
import { multiPlatformQuery, getSummary } from '../core/search-agent';

// ==================== 安全约定 ====================
// contextIsolation=true、nodeIntegration=false，由 BrowserWindow 默认值保证，
// 这里显式声明 webPreferences 以确保安全。

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ChronoFlow',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 开发模式：加载 electron-vite 的 dev server
  // 生产模式：加载打包后的 index.html
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ==================== IPC 注册 ====================

function registerIpcHandlers(): void {
  // ---------- schedule:* 通道（暴露给渲染进程） ----------
  ipcMain.handle(IPC.SCHEDULE_GEN_TABLE, (_e, req) => genTableFromText(req));
  ipcMain.handle(IPC.SCHEDULE_EXTRACT_HIGHLIGHTS, (_e, req) => extractHighlights(req));
  ipcMain.handle(IPC.SCHEDULE_SAVE_CLASSIFIED, (_e, req) => saveClassifiedInfo(req));
  ipcMain.handle(IPC.SCHEDULE_QUERY_CLASSIFIED, (_e, req) => queryClassifiedItems(req));
  ipcMain.handle(IPC.SCHEDULE_CREATE, (_e, input) => createSchedule(input));
  ipcMain.handle(IPC.SCHEDULE_UPDATE, (_e, item) => updateSchedule(item));
  ipcMain.handle(IPC.SCHEDULE_DELETE, (_e, id) => deleteSchedule(id));
  ipcMain.handle(IPC.SCHEDULE_QUERY, (_e, req) => querySchedule(req));

  // ---------- search:* 通道（内部，不暴露给渲染进程） ----------
  ipcMain.handle(IPC.SEARCH_MULTI_PLATFORM, (_e, req) => multiPlatformQuery(req));
  ipcMain.handle(IPC.SEARCH_GET_SUMMARY, (_e, req) => getSummary(req));
}

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // macOS：点击 Dock 图标时若无窗口则重建
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // macOS 之外，关闭所有窗口即退出应用
  if (process.platform !== 'darwin') app.quit();
});
