import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const pngPath = path.join(publicDir, "logo-alcentimo-hd.png");
const svgPath = path.join(publicDir, "logo-completo.svg");

if (!existsSync(pngPath)) {
  throw new Error("Missing public/logo-alcentimo-hd.png");
}

const b64 = readFileSync(pngPath).toString("base64");
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 744 116" width="744" height="116" role="img" aria-label="Alcentimo" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <image width="744" height="116" xlink:href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

writeFileSync(svgPath, svg);
unlinkSync(pngPath);
console.log(`wrote ${svgPath} (${svg.length} bytes)`);
