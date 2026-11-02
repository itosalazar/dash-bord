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
