import imageCompression from "browser-image-compression";
import {
  formatImageSize,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
} from "@/lib/product-image";

const MAX_OUTPUT_MB = PRODUCT_IMAGE_MAX_OUTPUT_BYTES / (1024 * 1024);

function toWebpFile(blob: Blob, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Comprime en el navegador antes de enviar al Server Action.
 * Redimensiona a máx. 1350px y convierte a WebP ≤ 2 MB.
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

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_OUTPUT_MB,
    maxWidthOrHeight: PRODUCT_IMAGE_MAX_DIMENSION,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.85,
    maxIteration: 15,
  });

  const webpFile = toWebpFile(compressed, file.name);

  if (webpFile.size > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error(
      "No se pudo optimizar la imagen por debajo de 2 MB. Prueba con otra foto.",
    );
  }

  const message = `Optimizada: ${formatImageSize(originalSize)} → ${formatImageSize(webpFile.size)} (WebP, máx. 1350px).`;

  return { file: webpFile, message };
}
