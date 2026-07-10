import sharp from "sharp";

export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_MAX_BYTES = 70 * 1024; // 70 KB
const MIN_QUALITY = 35;
const START_QUALITY = 82;
const QUALITY_STEP = 7;

export interface ImageOptimizationResult {
  buffer: Buffer;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  quality: number;
  format: "webp";
}

function toBuffer(input: Buffer | ArrayBuffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

async function encodeWebp(
  input: Buffer,
  width: number,
  quality: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const buffer = await sharp(input, { animated: false })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width ?? width,
    height: meta.height ?? width,
  };
}

/**
 * Comprime y redimensiona imágenes de producto para catálogo web.
 * - Máx. 1200px de ancho
 * - Formato WebP
 * - Objetivo: ≤ 70 KB
 */
export async function compressProductImage(
  input: Buffer | ArrayBuffer,
): Promise<ImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;

  let quality = START_QUALITY;
  let width = IMAGE_MAX_WIDTH;
  let best = await encodeWebp(source, width, quality);

  while (best.buffer.length > IMAGE_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    best = await encodeWebp(source, width, quality);
  }

  while (best.buffer.length > IMAGE_MAX_BYTES && width > 480) {
    width -= 200;
    quality = Math.max(MIN_QUALITY, quality - 5);
    best = await encodeWebp(source, width, quality);
  }

  return {
    buffer: best.buffer,
    width: best.width,
    height: best.height,
    originalSize,
    compressedSize: best.buffer.length,
    quality,
    format: "webp",
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
