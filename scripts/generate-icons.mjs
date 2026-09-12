// Generates simple placeholder PWA icons (solid brand-colour squares with a
// centered "L") without any image-processing dependency — this sandbox has
// neither sharp nor ImageMagick available. Replace with real branded
// artwork before launch (Section 41: no copyrighted/borrowed artwork).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
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

function drawL(x, y, size, fg, bg) {
  const barW = Math.round(size * 0.16);
  const inLetter = x < barW && y > size * 0.22 ? true : x < size * 0.62 && y > size * 0.68 - barW / 2 && y < size * 0.68 + barW / 2;
  return inLetter ? fg : bg;
}

function makePng(size, bg, fg) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const margin = Math.round(size * 0.2);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const inGlyph = x >= margin && x <= size - margin && y >= margin && y <= size - margin && drawL(x - margin, y - margin, size - margin * 2, true, false);
      const [r, g, b] = inGlyph ? fg : bg;
      const off = y * (size * 4 + 1) + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const BG = [11, 14, 20]; // --color-bg
const FG = [34, 211, 238]; // --color-accent

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 256, 384, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makePng(size, BG, FG));
}
writeFileSync("public/icons/apple-touch-icon.png", makePng(180, BG, FG));
writeFileSync("public/icons/maskable-512.png", makePng(512, BG, FG));
console.log("Generated placeholder PWA icons in public/icons/");
