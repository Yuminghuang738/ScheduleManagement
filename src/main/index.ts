/**
 * ChronoFlow 主进程入口 —— 统一注册全部 IPC handler
 * 【集成工程师维护 —— 禁止其他人修改】
 */

import { ipcMain } from 'electron';
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
} from './schedule';
import { multiPlatformQuery, getSummary } from './search-agent';

// ==================== schedule:* 通道（暴露给渲染进程） ====================

ipcMain.handle(IPC.SCHEDULE_GEN_TABLE, (_e, req) => genTableFromText(req));
ipcMain.handle(IPC.SCHEDULE_EXTRACT_HIGHLIGHTS, (_e, req) => extractHighlights(req));
ipcMain.handle(IPC.SCHEDULE_SAVE_CLASSIFIED, (_e, req) => saveClassifiedInfo(req));
ipcMain.handle(IPC.SCHEDULE_QUERY_CLASSIFIED, (_e, req) => queryClassifiedItems(req));
ipcMain.handle(IPC.SCHEDULE_CREATE, (_e, input) => createSchedule(input));
ipcMain.handle(IPC.SCHEDULE_UPDATE, (_e, item) => updateSchedule(item));
ipcMain.handle(IPC.SCHEDULE_DELETE, (_e, id) => deleteSchedule(id));
ipcMain.handle(IPC.SCHEDULE_QUERY, (_e, req) => querySchedule(req));

// ==================== search:* 通道（仅内部注册，不通过 preload 暴露） ====================

ipcMain.handle(IPC.SEARCH_MULTI_PLATFORM, (_e, req) => multiPlatformQuery(req));
ipcMain.handle(IPC.SEARCH_GET_SUMMARY, (_e, req) => getSummary(req));