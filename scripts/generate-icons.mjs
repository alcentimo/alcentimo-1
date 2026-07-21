import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");

/** Fallback PWA icons (emerald brand) when no custom platform logo is uploaded. */
function createIconSvg(size) {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.42);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${radius}" fill="#059669"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
        font-weight="700" fill="#ffffff">a</text>
</svg>`;
}

await mkdir(publicDir, { recursive: true });

for (const size of [192, 512]) {
  const svg = Buffer.from(createIconSvg(size));
  await sharp(svg).png().toFile(path.join(publicDir, `icon-${size}x${size}.png`));
}

console.log("PWA icons generated in public/");
