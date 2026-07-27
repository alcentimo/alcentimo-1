import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const isotypeSvgPath = path.join(publicDir, "brand-isotype-favicon.svg");

const OUTPUTS = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "icon-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
  { file: "icon-512x512.png", size: 512 },
];

/** Isotipo cuadrado 1:1 — rellena todo el canvas sin márgenes blancos. */
async function renderIsotypePng(size) {
  const svg = await readFile(isotypeSvgPath);
  const density = Math.max(96, Math.ceil((size / 40) * 96));

  return sharp(svg, { density })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

await mkdir(publicDir, { recursive: true });

console.log("Generating favicons from public/brand-isotype-favicon.svg …");

for (const { file, size } of OUTPUTS) {
  const buffer = await renderIsotypePng(size);
  await writeFile(path.join(publicDir, file), buffer);
  console.log(`  wrote public/${file}`);
}

const favicon32 = await renderIsotypePng(32);
await writeFile(path.join(publicDir, "favicon.ico"), favicon32);
console.log("  wrote public/favicon.ico (32px)");

console.log("Platform PWA icons and favicons generated in public/");
