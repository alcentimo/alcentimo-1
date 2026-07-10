import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");

function createIconSvg(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${size * 0.18}" fill="#171717"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.42)}"
        font-weight="700" fill="#ffffff">a</text>
</svg>`;
}

await mkdir(publicDir, { recursive: true });

for (const size of [192, 512]) {
  const svg = Buffer.from(createIconSvg(size));
  await sharp(svg).png().toFile(path.join(publicDir, `icon-${size}x${size}.png`));
}

console.log("PWA icons generated in public/");
