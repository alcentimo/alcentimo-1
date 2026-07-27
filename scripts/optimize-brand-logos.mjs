import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const brandDir = path.join(publicDir, "brand");

function isLogoPixel(r, g, b) {
  const green = g > 120 && g > r + 40 && g > b + 20;
  const navy = b > 60 && r < 60 && g < 80;
  return green || navy;
}

function isBackgroundPixel(r, g, b) {
  if (isLogoPixel(r, g, b)) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 40 && max < 230;
}

async function findLogoBounds(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const rowCounts = Array.from({ length: height }, () => 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (isLogoPixel(r, g, b)) {
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

  if (top < 0 || bottom < 0) {
    throw new Error(`Could not detect logo bounds in ${inputPath}`);
  }

  let left = width;
  let right = 0;

  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (!isLogoPixel(r, g, b)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }

  const padding = Math.max(4, Math.round((bottom - top + 1) * 0.06));

  return {
    left: Math.max(0, left - padding),
    top: Math.max(0, top - padding),
    width: Math.min(width, right - left + 1 + padding * 2),
    height: Math.min(height, bottom - top + 1 + padding * 2),
  };
}

async function makeTransparentLogo(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = Buffer.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];

      if (isBackgroundPixel(r, g, b)) {
        pixels[index + 3] = 0;
      } else {
        pixels[index + 3] = 255;
      }
    }
  }

  const bounds = await findLogoBounds(inputPath);
  const tempPath = `${outputPath}.optimized.png`;

  await sharp(pixels, {
    raw: { width, height, channels },
  })
    .extract(bounds)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(tempPath);

  await sharp(tempPath).toFile(outputPath);
  await import("node:fs/promises").then(({ unlink }) => unlink(tempPath).catch(() => {}));

  const meta = await sharp(outputPath).metadata();
  console.log(
    `  wrote ${path.relative(process.cwd(), outputPath)} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`,
  );
}

await mkdir(brandDir, { recursive: true });

console.log("Optimizing brand logos…");

await makeTransparentLogo(
  path.join(brandDir, "logo-completo-alcentimo.png"),
  path.join(brandDir, "logo-completo-alcentimo.png"),
);

await makeTransparentLogo(
  path.join(brandDir, "isotipo-alcentimo.png"),
  path.join(brandDir, "isotipo-alcentimo.png"),
);

console.log("Brand logos optimized.");
