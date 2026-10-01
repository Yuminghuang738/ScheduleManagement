/**
 * 在 CI 中生成占位应用图标。
 *
 * 背景：electron-builder.yml 指定了
 *   win.icon:   resources/icon.ico
 *   linux.icon: resources/icon.png
 * 但仓库未提交这两个二进制文件，直接打包会报 "cannot find icon"。
 * 本脚本按需生成占位图标（纯 Node 实现，无第三方依赖、跨平台一致）：
 *   resources/icon.png  512x512  RGBA
 *   resources/icon.ico  256x256  （内嵌 PNG 数据，Windows 支持）
 *
 * 若同名文件已存在则跳过，不会覆盖你后续放入的真实图标。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 生成一张斜向渐变的方形 PNG（RGBA，8bit）。 */
function createPng(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const t = (x + y) / (2 * size); // 0..1
      raw[i] = Math.round(0x6b + (0xa8 - 0x6b) * t); // R
      raw[i + 1] = Math.round(0x7c + (0x6b - 0x7c) * t); // G
      raw[i + 2] = 0xff; // B
      raw[i + 3] = 0xff; // A
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/** 用单张 256x256 PNG 组装一个合法的 .ico 文件。 */
function createIcoFromPng(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry[0] = 0; // width  (0 表示 256)
  entry[1] = 0; // height (0 表示 256)
  entry[2] = 0; // 调色板数量
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // 图像数据长度
  entry.writeUInt32LE(6 + 16, 12); // 图像数据偏移

  return Buffer.concat([header, entry, png]);
}

const pngPath = resolve(root, 'resources', 'icon.png');
const icoPath = resolve(root, 'resources', 'icon.ico');
mkdirSync(dirname(pngPath), { recursive: true });

if (existsSync(pngPath)) {
  console.log(`[icons] 已存在，跳过：${pngPath}`);
} else {
  writeFileSync(pngPath, createPng(512));
  console.log(`[icons] 已生成：${pngPath}`);
}

if (existsSync(icoPath)) {
  console.log(`[icons] 已存在，跳过：${icoPath}`);
} else {
  writeFileSync(icoPath, createIcoFromPng(createPng(256)));
  console.log(`[icons] 已生成：${icoPath}`);
}