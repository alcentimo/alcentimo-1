import imageCompression from "browser-image-compression";
import {
  formatImageSize,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";

const MIN_QUALITY = 0.45;
const QUALITY_STEP = 0.08;
const MIN_DIMENSION = 480;
const DIMENSION_STEP = 80;
const MAX_OUTPUT_MB = PRODUCT_IMAGE_MAX_OUTPUT_BYTES / (1024 * 1024);

function toWebpFile(blob: Blob, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Comprime en el navegador antes de enviar al servidor.
 * Redimensiona a máx. 800px, convierte a WebP (75%) y apunta a < 40 KB.
 */
export async function compressImageForUpload(
  file: File,
): Promise<{ file: File; message: string }> {
  if (file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `La imagen es demasiado grande (${formatImageSize(file.size)}). Usa un archivo menor a ${formatImageSize(PRODUCT_IMAGE_MAX_INPUT_BYTES)}.`,
    );
  }

  const originalSize = file.size;
  let maxDim = PRODUCT_IMAGE_MAX_DIMENSION;
  let webpFile: File | null = null;

  while (maxDim >= MIN_DIMENSION) {
    let quality = PRODUCT_IMAGE_WEBP_QUALITY;

    while (quality >= MIN_QUALITY) {
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_OUTPUT_MB,
        maxWidthOrHeight: maxDim,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: quality,
        maxIteration: 20,
      });

      const candidate = toWebpFile(compressed, file.name);
      webpFile = candidate;

      if (candidate.size <= PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
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
      "No se pudo optimizar la imagen por debajo de 40 KB. Prueba con otra foto.",
    );
  }

  const message = `Optimizada: ${formatImageSize(originalSize)} → ${formatImageSize(webpFile.size)} (WebP, máx. ${maxDim}px).`;

  return { file: webpFile, message };
}
