import {
  BANNER_MAX_INPUT_BYTES,
  BANNER_MAX_OUTPUT_BYTES,
  BANNER_WEBP_QUALITY,
  getBannerMaxDimension,
  type BannerImageVariant,
} from "@/lib/banner-image";
import {
  formatImageSize,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";

/** Alineado con el servidor: no bajar de ~70% para evitar artefactos. */
const MIN_QUALITY = 0.7;
const QUALITY_STEP = 0.05;
const MIN_DIMENSION = 720;
const DIMENSION_STEP = 64;
const MAX_OUTPUT_MB = PRODUCT_IMAGE_MAX_OUTPUT_BYTES / (1024 * 1024);

type ImageCompressionFn = (
  file: File,
  options: Parameters<
    Awaited<typeof import("browser-image-compression")>["default"]
  >[1],
) => Promise<File | Blob>;

let imageCompressionLoader: Promise<ImageCompressionFn> | null = null;

async function getImageCompression(): Promise<ImageCompressionFn> {
  if (!imageCompressionLoader) {
    imageCompressionLoader = import("browser-image-compression").then(
      (mod) => mod.default,
    );
  }
  return imageCompressionLoader;
}

function toWebpFile(blob: Blob, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Comprime en el navegador antes de enviar al servidor.
 * Redimensiona a máx. 1024px, convierte a WebP (~80%) y apunta a ≤ 120 KB
 * priorizando nitidez (baja dimensión antes que calidad).
 */
export async function compressImageForUpload(
  file: File,
): Promise<{ file: File; message: string }> {
  if (file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `La imagen es demasiado grande (${formatImageSize(file.size)}). Usa un archivo menor a ${formatImageSize(PRODUCT_IMAGE_MAX_INPUT_BYTES)}.`,
    );
  }

  // Conservar animación: no convertir GIF a WebP estático.
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) {
    return {
      file,
      message: "GIF animado conservado sin conversión.",
    };
  }

  const imageCompression = await getImageCompression();

  const originalSize = file.size;
  let maxDim = PRODUCT_IMAGE_MAX_DIMENSION;
  let usedQuality = PRODUCT_IMAGE_WEBP_QUALITY;
  let webpFile: File | null = null;

  // Primero intentar a 1024px / calidad 80%, luego bajar dimensión, luego calidad.
  while (maxDim >= MIN_DIMENSION) {
    let quality = PRODUCT_IMAGE_WEBP_QUALITY;

    while (quality >= MIN_QUALITY) {
      let compressed: File | Blob;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: MAX_OUTPUT_MB,
          maxWidthOrHeight: maxDim,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: quality,
          maxIteration: 20,
        });
      } catch {
        compressed = await imageCompression(file, {
          maxSizeMB: MAX_OUTPUT_MB,
          maxWidthOrHeight: maxDim,
          useWebWorker: false,
          fileType: "image/webp",
          initialQuality: quality,
          maxIteration: 20,
        });
      }

      const candidate = toWebpFile(compressed, file.name);
      webpFile = candidate;
      usedQuality = quality;

      if (candidate.size <= PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
        const qualityPct = Math.round(usedQuality * 100);
        const message = `Optimizada: ${formatImageSize(originalSize)} → ${formatImageSize(candidate.size)} (WebP máx. ${maxDim}px, calidad ${qualityPct}%).`;
        return { file: candidate, message };
      }

      // Si aún es grande a calidad alta, bajar dimensión antes que calidad.
      if (quality === PRODUCT_IMAGE_WEBP_QUALITY && maxDim > MIN_DIMENSION) {
        break;
      }

      quality -= QUALITY_STEP;
    }

    if (webpFile && webpFile.size <= PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
      break;
    }

    maxDim -= DIMENSION_STEP;
  }

  if (!webpFile || webpFile.size > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error(
      "No se pudo optimizar la imagen por debajo de 120 KB. Prueba con otra foto.",
    );
  }

  const qualityPct = Math.round(usedQuality * 100);
  const message = `Optimizada: ${formatImageSize(originalSize)} → ${formatImageSize(webpFile.size)} (WebP máx. ${maxDim}px, calidad ${qualityPct}%).`;

  return { file: webpFile, message };
}

/**
 * Comprime banners en el navegador antes de subirlos (WebP, dimensiones por variante).
 */
export async function compressBannerImageForUpload(
  file: File,
  variant: BannerImageVariant,
): Promise<{ file: File; message: string }> {
  const imageCompression = await getImageCompression();

  if (file.size > BANNER_MAX_INPUT_BYTES) {
    throw new Error(
      `La imagen es demasiado grande (${formatImageSize(file.size)}). Usa un archivo menor a ${formatImageSize(BANNER_MAX_INPUT_BYTES)}.`,
    );
  }

  const originalSize = file.size;
  const maxDim = getBannerMaxDimension(variant);
  let usedQuality = BANNER_WEBP_QUALITY;
  let webpFile: File | null = null;
  let currentMaxDim = maxDim;

  while (currentMaxDim >= 640) {
    let quality = BANNER_WEBP_QUALITY;

    while (quality >= 0.68) {
      let compressed: File | Blob;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: BANNER_MAX_OUTPUT_BYTES / (1024 * 1024),
          maxWidthOrHeight: currentMaxDim,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: quality,
          maxIteration: 20,
        });
      } catch {
        compressed = await imageCompression(file, {
          maxSizeMB: BANNER_MAX_OUTPUT_BYTES / (1024 * 1024),
          maxWidthOrHeight: currentMaxDim,
          useWebWorker: false,
          fileType: "image/webp",
          initialQuality: quality,
          maxIteration: 20,
        });
      }

      const candidate = toWebpFile(compressed, file.name);
      webpFile = candidate;
      usedQuality = quality;

      if (candidate.size <= BANNER_MAX_OUTPUT_BYTES) {
        const qualityPct = Math.round(usedQuality * 100);
        const message = `Optimizada (${variant}): ${formatImageSize(originalSize)} → ${formatImageSize(candidate.size)} (WebP máx. ${currentMaxDim}px, calidad ${qualityPct}%).`;
        return { file: candidate, message };
      }

      if (quality === BANNER_WEBP_QUALITY && currentMaxDim > 640) {
        break;
      }

      quality -= 0.05;
    }

    if (webpFile && webpFile.size <= BANNER_MAX_OUTPUT_BYTES) {
      break;
    }

    currentMaxDim -= 80;
  }

  if (!webpFile || webpFile.size > BANNER_MAX_OUTPUT_BYTES) {
    throw new Error(
      "No se pudo optimizar el banner por debajo de 100 KB. Prueba con otra imagen.",
    );
  }

  const qualityPct = Math.round(usedQuality * 100);
  const message = `Optimizada (${variant}): ${formatImageSize(originalSize)} → ${formatImageSize(webpFile.size)} (WebP máx. ${currentMaxDim}px, calidad ${qualityPct}%).`;

  return { file: webpFile, message };
}
