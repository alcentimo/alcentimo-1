import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const brandDir = path.join(publicDir, "brand");

const SOURCE_CANDIDATES = [
  path.join(process.cwd(), "assets", "logo-completo-alcentimo.png"),
  "C:/Users/Admin/.cursor/projects/c-Users-Admin-Desktop-alcentimo-1/assets/c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_logo_completo-fc7fe0f7-2d75-4343-9749-578a07dc6454.png",
  path.join(brandDir, "logo-completo-alcentimo.png"),
];

async function resolveSourcePath() {
  for (const candidate of SOURCE_CANDIDATES) {
    try {
      const meta = await sharp(candidate).metadata();
      if (meta.width && meta.height) return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("No se encontró el logo completo de origen.");
}

function isLogoPixel(r, g, b) {
  const green = g > 120 && g > r + 40 && g > b + 20;
  const navy = b > 60 && r < 60 && g < 80;
  return green || navy;
}

function alphaForPixel(r, g, b) {
  if (isLogoPixel(r, g, b)) return 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  const darkGray =
    chroma < 28 &&
    max < 95 &&
    Math.abs(r - g) < 18 &&
    Math.abs(g - b) < 18;
  const lightGray =
    chroma < 28 &&
    min > 150 &&
    max < 225 &&
    Math.abs(r - g) < 18 &&
    Math.abs(g - b) < 18;

  if (darkGray || lightGray) return 0;
  if (chroma < 40) return 0;

  return Math.min(255, Math.round((chroma / 40) * 255));
}

async function findFullLogoBounds(inputPath) {
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rowCounts = Array.from({ length: height }, () => 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      if (isLogoPixel(data[index], data[index + 1], data[index + 2])) {
        rowCounts[y] += 1;
      }
    }
  }

  const peak = Math.max(...rowCounts);
  const threshold = Math.max(12, peak * 0.12);
  let top = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    if (rowCounts[y] >= threshold) {
      if (top < 0) top = y;
      bottom = y;
    }
  }

  let left = width;
  let right = 0;

  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      if (!isLogoPixel(data[index], data[index + 1], data[index + 2])) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }

  const padding = Math.max(6, Math.round((bottom - top + 1) * 0.05));

  return {
    left: Math.max(0, left - padding),
    top: Math.max(0, top - padding),
    width: Math.min(width, right - left + 1 + padding * 2),
    height: Math.min(height, bottom - top + 1 + padding * 2),
  };
}

async function buildTransparentLogoBuffer(sourcePath, bounds, scale = 1) {
  const { data, info } = await sharp(sourcePath)
    .extract(bounds)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * channels;
      const dst = (y * width + x) * 4;
      const r = data[src];
      const g = data[src + 1];
      const b = data[src + 2];
      const alpha = alphaForPixel(r, g, b);

      rgba[dst] = r;
      rgba[dst + 1] = g;
      rgba[dst + 2] = b;
      rgba[dst + 3] = alpha;
    }
  }

  let pipeline = sharp(rgba, {
    raw: { width, height, channels: 4 },
  }).png({ compressionLevel: 6, adaptiveFiltering: false });

  if (scale !== 1) {
    pipeline = pipeline.resize(Math.round(width * scale), Math.round(height * scale), {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }

  return pipeline.toBuffer();
}

await mkdir(brandDir, { recursive: true });

console.log("Exporting crisp landing logo…");
const sourcePath = await resolveSourcePath();
console.log(`  source: ${sourcePath}`);

const bounds = await findFullLogoBounds(sourcePath);
const outputPath = path.join(brandDir, "logo-completo-alcentimo.png");
const output2xPath = path.join(brandDir, "logo-completo-alcentimo@2x.png");

const png1x = await buildTransparentLogoBuffer(sourcePath, bounds, 1);
const png2x = await buildTransparentLogoBuffer(sourcePath, bounds, 2);

await writeFile(outputPath, png1x);
await writeFile(output2xPath, png2x);

const meta = await sharp(outputPath).metadata();
console.log(`  wrote ${path.relative(process.cwd(), outputPath)} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
console.log(`  wrote ${path.relative(process.cwd(), output2xPath)} (${(meta.width ?? 0) * 2}x${(meta.height ?? 0) * 2})`);

await writeFile(
  path.join(brandDir, "logo-completo-alcentimo.meta.json"),
  JSON.stringify({ width: meta.width, height: meta.height }),
);

console.log("Landing logo export complete.");
