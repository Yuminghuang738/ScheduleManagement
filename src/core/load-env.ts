/**
 * 主进程 .env 加载器 —— 必须在其他模块之前被 import（见 index.ts 第一行）。
 *
 * 背景：`src/shared/config.ts` 是冻结契约，读的是 `process.env.MOCK_MODE`。
 * 而 electron-vite / Vite 只会把带前缀（MAIN_VITE_ / VITE_ …）的变量注入 import.meta.env，
 * 无前缀的 MOCK_MODE 不会进 process.env，导致 .env 形同虚设。
 *
 * 这里在运行时把项目根目录的 .env 读进 process.env，规则：
 *   - 已存在的环境变量优先（shell 显式设置 > .env），不覆盖；
 *   - 文件不存在时静默跳过；
 *   - 只做最小解析：KEY=VALUE，支持 # 注释与成对引号。
 *
 * 注意：裸 .env 内容只会进入主进程，不会泄漏给渲染进程（渲染层仍只有带前缀的变量）。
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 产物位于 out/main，故向上两级回到项目根
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseAndApply(file: string): void {
  if (!existsSync(file)) return;

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // shell 里显式设置的值优先级最高
    if (!(key in process.env)) process.env[key] = value;
  }
}

parseAndApply(path.join(projectRoot, '.env'));
