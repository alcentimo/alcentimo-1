import sharp from "sharp";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";

/** Calidad mínima absoluta: por debajo aparecen artefactos visibles. */
const MIN_QUALITY = 70;
const START_QUALITY = Math.round(PRODUCT_IMAGE_WEBP_QUALITY * 100);
const QUALITY_STEP = 5;
/** Lado largo mínimo al reducir para caber en 120 KB. */
const MIN_DIMENSION = 720;
const DIMENSION_STEP = 64;

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
  maxDimension: number,
  quality: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const buffer = await sharp(input, { animated: false })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width ?? maxDimension,
    height: meta.height ?? maxDimension,
  };
}

/**
 * Optimización de catálogo en servidor:
 * - Redimensiona a máx. 1024×1024 (mantiene proporción)
 * - Convierte siempre a WebP
 * - Calidad inicial 80%; si supera 120 KB, reduce dimensión antes que calidad
 * - No baja de calidad 70% para preservar texturas y detalle
 */
export async function compressProductImage(
  input: Buffer | ArrayBuffer,
): Promise<ImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;

  let quality = START_QUALITY;
  let maxDimension = PRODUCT_IMAGE_MAX_DIMENSION;
  let best = await encodeWebp(source, maxDimension, quality);

  // Preferir mantener calidad ~80% y bajar resolución si hace falta.
  while (
    best.buffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES &&
    maxDimension > MIN_DIMENSION
  ) {
    maxDimension -= DIMENSION_STEP;
    best = await encodeWebp(source, maxDimension, quality);
  }

  while (
    best.buffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES &&
    quality > MIN_QUALITY
  ) {
    quality -= QUALITY_STEP;
    best = await encodeWebp(source, maxDimension, quality);
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
