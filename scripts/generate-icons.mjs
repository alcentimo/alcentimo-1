import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const sourcePath = path.join(publicDir, "isotipo-alcentimo.png");

/** Fondo del splash PWA Admin (= #0f172a / slate-900). */
const MASKABLE_BG = { r: 15, g: 23, b: 42, alpha: 1 };

const OUTPUTS = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "icon-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
  { file: "icon-512x512.png", size: 512 },
];

const MASKABLE_OUTPUTS = [
  { file: "icon-maskable-192x192.png", size: 192 },
  { file: "icon-maskable-512x512.png", size: 512 },
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

/**
 * Maskable: logo en la zona segura (~60% del canvas) con padding ~20%
 * sobre fondo opaco del splash, para que Android/iOS no recorten el isotipo.
 */
async function renderMaskablePng(size) {
  const pad = Math.round(size * 0.2);
  const inner = Math.max(1, size - pad * 2);
  const logo = await sharp(sourcePath)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: MASKABLE_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
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

console.log("Generating maskable PWA icons …");

for (const { file, size } of MASKABLE_OUTPUTS) {
  const buffer = await renderMaskablePng(size);
  await writeFile(path.join(publicDir, file), buffer);
  console.log(`  wrote public/${file}`);
}

const favicon32 = await renderIconPng(32);
await writeFile(path.join(publicDir, "favicon.ico"), favicon32);
console.log("  wrote public/favicon.ico (32px)");

console.log("Platform PWA icons and favicons generated in public/");
