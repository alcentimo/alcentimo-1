import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const sourcePath = path.join(publicDir, "isotipo-alcentimo.png");

const OUTPUTS = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "icon-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
  { file: "icon-512x512.png", size: 512 },
];

async function renderIconPng(size) {
  return sharp(sourcePath)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

await mkdir(publicDir, { recursive: true });

console.log("Generating favicons from public/isotipo-alcentimo.png …");

for (const { file, size } of OUTPUTS) {
  const buffer = await renderIconPng(size);
  await writeFile(path.join(publicDir, file), buffer);
  console.log(`  wrote public/${file}`);
}

const favicon32 = await renderIconPng(32);
await writeFile(path.join(publicDir, "favicon.ico"), favicon32);
console.log("  wrote public/favicon.ico (32px)");

console.log("Platform PWA icons and favicons generated in public/");
