import "server-only";

import {
  BANNER_MAX_OUTPUT_BYTES,
  BANNER_WEBP_QUALITY,
  getBannerMaxDimensions,
  type BannerImageVariant,
} from "@/lib/banner-image";
import { formatFileSize } from "@/lib/format-file-size";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";
import {
  PAYMENT_PROOF_MAX_DIMENSION,
  PAYMENT_PROOF_MAX_OUTPUT_BYTES,
  PAYMENT_PROOF_MIN_WEBP_QUALITY,
  PAYMENT_PROOF_WEBP_QUALITY,
} from "@/lib/orders/payment-proof-policy";

export { formatFileSize };

async function loadSharp() {
  return (await import("sharp")).default;
}

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
  const sharp = await loadSharp();
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

/**
 * Comprobantes de pago (pedidos / suscripción):
 * - Máx. 1080px (lado largo), proporción intacta
 * - WebP calidad ~75–78%
 * - Objetivo < 200 KB
 */
export async function compressPaymentProofImage(
  input: Buffer | ArrayBuffer,
): Promise<ImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;

  let quality = Math.round(PAYMENT_PROOF_WEBP_QUALITY * 100);
  const minQuality = Math.round(PAYMENT_PROOF_MIN_WEBP_QUALITY * 100);
  let maxDimension = PAYMENT_PROOF_MAX_DIMENSION;
  let best = await encodeWebp(source, maxDimension, quality);

  while (
    best.buffer.length > PAYMENT_PROOF_MAX_OUTPUT_BYTES &&
    maxDimension > MIN_DIMENSION
  ) {
    maxDimension -= DIMENSION_STEP;
    best = await encodeWebp(source, maxDimension, quality);
  }

  while (
    best.buffer.length > PAYMENT_PROOF_MAX_OUTPUT_BYTES &&
    quality > minQuality
  ) {
    quality -= QUALITY_STEP;
    best = await encodeWebp(source, maxDimension, quality);
  }

  // Último recurso: bajar un poco más la dimensión sin romper legibilidad.
  while (
    best.buffer.length > PAYMENT_PROOF_MAX_OUTPUT_BYTES &&
    maxDimension > 640
  ) {
    maxDimension -= DIMENSION_STEP;
    best = await encodeWebp(source, maxDimension, quality);
  }

  if (best.buffer.length > PAYMENT_PROOF_MAX_OUTPUT_BYTES) {
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

async function encodeBannerWebp(
  input: Buffer,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharp = await loadSharp();
  const buffer = await sharp(input, { animated: false })
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width ?? maxWidth,
    height: meta.height ?? maxHeight,
  };
}

/**
 * Optimiza banners promocionales: recorte proporcional, WebP y ≤100 KB.
 */
export async function compressBannerImage(
  input: Buffer | ArrayBuffer,
  variant: BannerImageVariant,
): Promise<ImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;
  const { maxWidth, maxHeight } = getBannerMaxDimensions(variant);

  let quality = Math.round(BANNER_WEBP_QUALITY * 100);
  const minQuality = 68;
  let width = maxWidth;
  let height = maxHeight;
  let best = await encodeBannerWebp(source, width, height, quality);

  while (best.buffer.length > BANNER_MAX_OUTPUT_BYTES && width > 640) {
    width = Math.max(640, width - 80);
    height = Math.max(
      variant === "desktop" ? 160 : 120,
      Math.round(height * 0.9),
    );
    best = await encodeBannerWebp(source, width, height, quality);
  }

  while (best.buffer.length > BANNER_MAX_OUTPUT_BYTES && quality > minQuality) {
    quality -= 5;
    best = await encodeBannerWebp(source, width, height, quality);
  }

  if (best.buffer.length > BANNER_MAX_OUTPUT_BYTES) {
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

