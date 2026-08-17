// 依存ライブラリなしでシンプルなブランドアイコン（PNG）を生成するスクリプト。
// デザイナー用のアイコンに差し替える場合は public/icons/ 以下のPNGを上書きすればよい。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BG = [0x21, 0x4b, 0x3c]; // 落ち着いたディープグリーン
const PAGE = [0xf3, 0xf0, 0xe6]; // 生成り色（紙）
const ACCENT = [0xc8, 0x8a, 0x3f]; // 控えめなアクセント（真鍮色）

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon({ size, maskable = false }) {
  // maskable の場合は安全領域(中央80%)にのみ図形を収める
  const pad = maskable ? size * 0.2 : size * 0.14;
  const pageX0 = pad;
  const pageX1 = size - pad;
  const pageY0 = pad * 0.8;
  const pageY1 = size - pad * 0.8;
  const accentY0 = size * 0.56;
  const accentY1 = size * 0.64;

  return encodePng(size, size, (x, y) => {
    const onPage = x >= pageX0 && x < pageX1 && y >= pageY0 && y < pageY1;
    if (!onPage) return [...BG, 255];
    const onAccent = y >= accentY0 && y < accentY1 && x >= pageX0 + (pageX1 - pageX0) * 0.15 && x < pageX1 - (pageX1 - pageX0) * 0.15;
    if (onAccent) return [...ACCENT, 255];
    return [...PAGE, 255];
  });
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  const png = makeIcon(t);
  writeFileSync(path.join(outDir, t.name), png);
  console.log(`generated ${t.name}`);
}
