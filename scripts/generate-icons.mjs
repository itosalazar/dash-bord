#!/usr/bin/env node
// Renders the app icon (an SVG drawn here) to the PNG sizes iOS/Android need.
// Output is committed to public/icons, so this only runs when the icon changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(out, { recursive: true });

// A bone-white dial with one hand and a vermilion dot, on desk-slate —
// the clock tile from the references, reduced to a mark.
function iconSvg({ padding = 0 } = {}) {
  const s = 1024;
  const r = 300 * (1 - padding);
  const c = s / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="#3b4048"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#ece9e2"/>
    <line x1="${c}" y1="${c}" x2="${c + r * 0.62}" y2="${c - r * 0.42}" stroke="#0c0c0c" stroke-width="${r * 0.11}" stroke-linecap="round"/>
    <line x1="${c}" y1="${c}" x2="${c - r * 0.18}" y2="${c - r * 0.5}" stroke="#9aa0a8" stroke-width="${r * 0.11}" stroke-linecap="round"/>
    <circle cx="${c}" cy="${c}" r="${r * 0.1}" fill="#0c0c0c"/>
    <circle cx="${c - r * 0.82}" cy="${c + r * 0.86}" r="${r * 0.13}" fill="#f0512b"/>
  </svg>`;
}

// Favicon: same mark, simplified for 16–32px — rounded slate tile, a larger
// dial, one bold hand and the vermilion dot pulled inside the tile.
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="15" fill="#3b4048"/>
    <circle cx="33" cy="31" r="21" fill="#ece9e2"/>
    <line x1="33" y1="31" x2="45" y2="23" stroke="#0c0c0c" stroke-width="5" stroke-linecap="round"/>
    <circle cx="33" cy="31" r="3.5" fill="#0c0c0c"/>
    <circle cx="13" cy="52" r="6" fill="#f0512b"/>
  </svg>`;
}

/** ICO container holding PNG frames (supported by every current browser). */
function toIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2); // palette
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const favicon = faviconSvg();
const frames = [];
for (const size of [16, 32, 48]) {
  frames.push({ size, data: await sharp(Buffer.from(favicon)).resize(size, size).png({ compressionLevel: 9 }).toBuffer() });
}
writeFileSync(join(out, "..", "favicon.ico"), toIco(frames));
writeFileSync(join(out, "favicon.svg"), favicon);
writeFileSync(join(out, "favicon-32.png"), frames[1].data);
console.log("✓ favicon.ico (16/32/48), favicon.svg, favicon-32.png");

const jobs = [
  { file: "apple-touch-icon.png", size: 180, svg: iconSvg() },
  { file: "icon-192.png", size: 192, svg: iconSvg() },
  { file: "icon-512.png", size: 512, svg: iconSvg() },
  { file: "icon-maskable-512.png", size: 512, svg: iconSvg({ padding: 0.12 }) },
];

for (const job of jobs) {
  const png = await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(out, job.file), png);
  console.log(`✓ ${job.file}`);
}
writeFileSync(join(out, "icon.svg"), iconSvg());
console.log("✓ icon.svg");
