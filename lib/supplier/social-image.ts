import "server-only";

import sharp from "sharp";
import { formatFileSize } from "@/lib/format-file-size";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";

/** Cuadrado listo para Instagram feed / Facebook / WhatsApp. */
export const SOCIAL_PRODUCT_IMAGE_SIZE = 1080;

/** Calidad JPEG alta para redes (sin edición manual). */
export const SOCIAL_PRODUCT_IMAGE_JPEG_QUALITY = 88;

/** Tope de peso del JPEG social (Instagram tolera ~1 MB; apuntamos más liviano). */
export const SOCIAL_PRODUCT_IMAGE_MAX_BYTES = 900 * 1024;

/** Sufijo del archivo social junto al WebP de catálogo. */
export const SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX = "-social.jpg";

export type SupplierImageOptimizationResult = {
  catalog: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    contentType: "image/webp";
    extension: "webp";
  };
  social: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    contentType: "image/jpeg";
    extension: "jpg";
  };
  originalSize: number;
};

function toBuffer(input: Buffer | ArrayBuffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

/**
 * Estandariza fotos de teléfono del mayorista:
 * 1) Cuadrado 1080×1080 (cover centrado) en JPEG alta calidad → redes
 * 2) WebP de catálogo (máx. 1024, ~120 KB) derivado del mismo recorte
 */
export async function optimizeSupplierProductImage(
  input: Buffer | ArrayBuffer,
): Promise<SupplierImageOptimizationResult> {
  const source = toBuffer(input);
  const originalSize = source.length;

  let socialQuality = SOCIAL_PRODUCT_IMAGE_JPEG_QUALITY;
  let socialBuffer = await sharp(source, { animated: false })
    .rotate()
    .resize({
      width: SOCIAL_PRODUCT_IMAGE_SIZE,
      height: SOCIAL_PRODUCT_IMAGE_SIZE,
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({
      quality: socialQuality,
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  while (
    socialBuffer.length > SOCIAL_PRODUCT_IMAGE_MAX_BYTES &&
    socialQuality > 72
  ) {
    socialQuality -= 4;
    socialBuffer = await sharp(source, { animated: false })
      .rotate()
      .resize({
        width: SOCIAL_PRODUCT_IMAGE_SIZE,
        height: SOCIAL_PRODUCT_IMAGE_SIZE,
        fit: "cover",
        position: "attention",
        withoutEnlargement: false,
      })
      .jpeg({
        quality: socialQuality,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
  }

  const socialMeta = await sharp(socialBuffer).metadata();

  // Catálogo: partir del JPEG social (ya cuadrado y limpio) → WebP liviano.
  let catalogQuality = Math.round(PRODUCT_IMAGE_WEBP_QUALITY * 100);
  let catalogDimension = Math.min(
    PRODUCT_IMAGE_MAX_DIMENSION,
    SOCIAL_PRODUCT_IMAGE_SIZE,
  );
  let catalogBuffer = await sharp(socialBuffer)
    .resize({
      width: catalogDimension,
      height: catalogDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: catalogQuality, effort: 4 })
    .toBuffer();

  while (
    catalogBuffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES &&
    catalogDimension > 720
  ) {
    catalogDimension -= 64;
    catalogBuffer = await sharp(socialBuffer)
      .resize({
        width: catalogDimension,
        height: catalogDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: catalogQuality, effort: 4 })
      .toBuffer();
  }

  while (
    catalogBuffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES &&
    catalogQuality > 70
  ) {
    catalogQuality -= 5;
    catalogBuffer = await sharp(socialBuffer)
      .resize({
        width: catalogDimension,
        height: catalogDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: catalogQuality, effort: 4 })
      .toBuffer();
  }

  if (catalogBuffer.length > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const catalogMeta = await sharp(catalogBuffer).metadata();

  return {
    originalSize,
    catalog: {
      buffer: catalogBuffer,
      width: catalogMeta.width ?? catalogDimension,
      height: catalogMeta.height ?? catalogDimension,
      size: catalogBuffer.length,
      contentType: "image/webp",
      extension: "webp",
    },
    social: {
      buffer: socialBuffer,
      width: socialMeta.width ?? SOCIAL_PRODUCT_IMAGE_SIZE,
      height: socialMeta.height ?? SOCIAL_PRODUCT_IMAGE_SIZE,
      size: socialBuffer.length,
      contentType: "image/jpeg",
      extension: "jpg",
    },
  };
}

export function buildSupplierOptimizationMessage(
  result: SupplierImageOptimizationResult,
): string {
  return `Foto lista para redes y catálogo: ${formatFileSize(result.originalSize)} → cuadrado ${result.social.width}×${result.social.height} (JPEG ${formatFileSize(result.social.size)}) + WebP catálogo ${formatFileSize(result.catalog.size)}.`;
}

/**
 * Deriva la URL pública del JPEG social a partir del WebP de catálogo.
 * `…/uuid.webp` → `…/uuid-social.jpg`
 */
export function deriveSupplierSocialImageUrl(
  catalogPublicUrl: string,
): string | null {
  try {
    const url = new URL(catalogPublicUrl);
    if (!url.pathname.includes("/product-images/")) return null;
    if (url.pathname.endsWith(SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX)) {
      return url.toString();
    }
    if (!/\.webp$/i.test(url.pathname)) return null;
    url.pathname = url.pathname.replace(
      /\.webp$/i,
      SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX,
    );
    return url.toString();
  } catch {
    return null;
  }
}

/** Path de storage relativo al bucket a partir de la URL pública. */
export function supplierImageStoragePathFromPublicUrl(
  publicUrl: string,
): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = "/storage/v1/object/public/product-images/";
    const idx = url.pathname.indexOf(marker);
    if (idx < 0) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/**
 * Genera JPEG social 1080×1080 desde cualquier imagen fuente
 * (p. ej. fotos antiguas solo WebP de catálogo).
 */
export async function renderSocialSquareJpegFromImage(
  input: Buffer | ArrayBuffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const source = toBuffer(input);
  let quality = SOCIAL_PRODUCT_IMAGE_JPEG_QUALITY;
  let buffer = await sharp(source, { animated: false })
    .rotate()
    .resize({
      width: SOCIAL_PRODUCT_IMAGE_SIZE,
      height: SOCIAL_PRODUCT_IMAGE_SIZE,
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  while (buffer.length > SOCIAL_PRODUCT_IMAGE_MAX_BYTES && quality > 72) {
    quality -= 4;
    buffer = await sharp(source, { animated: false })
      .rotate()
      .resize({
        width: SOCIAL_PRODUCT_IMAGE_SIZE,
        height: SOCIAL_PRODUCT_IMAGE_SIZE,
        fit: "cover",
        position: "attention",
        withoutEnlargement: false,
      })
      .jpeg({
        quality,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
  }

  return {
    buffer,
    width: SOCIAL_PRODUCT_IMAGE_SIZE,
    height: SOCIAL_PRODUCT_IMAGE_SIZE,
  };
}
