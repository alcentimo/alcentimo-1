import sharp from "sharp";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_TARGET_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";

const MIN_QUALITY = 35;
const START_QUALITY = Math.round(PRODUCT_IMAGE_WEBP_QUALITY * 100);
const QUALITY_STEP = 5;

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
    .resize({
      width,
      height: PRODUCT_IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
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
 * Respaldo en servidor: WebP, máx. 800px, objetivo < 40 KB.
 */
export async function compressProductImage(
  input: Buffer | ArrayBuffer,
): Promise<ImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;

  let quality = START_QUALITY;
  let width = PRODUCT_IMAGE_MAX_DIMENSION;
  let best = await encodeWebp(source, width, quality);

  while (
    best.buffer.length > PRODUCT_IMAGE_TARGET_BYTES &&
    quality > MIN_QUALITY
  ) {
    quality -= QUALITY_STEP;
    best = await encodeWebp(source, width, quality);
  }

  while (best.buffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES && width > 400) {
    width -= 80;
    quality = Math.max(MIN_QUALITY, quality - 5);
    best = await encodeWebp(source, width, quality);
  }

  while (
    best.buffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES &&
    quality > MIN_QUALITY
  ) {
    quality -= QUALITY_STEP;
    best = await encodeWebp(source, width, quality);
  }

  if (best.buffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
