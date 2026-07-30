import { compressImageForUpload } from "@/lib/client-image-compress";
import {
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
} from "@/lib/product-image";

/** Ya pasó por el compresor del cliente (WebP ≤ tope). */
export function isAlreadyClientOptimizedImage(file: File): boolean {
  return (
    file.type === "image/webp" &&
    file.size > 0 &&
    file.size <= PRODUCT_IMAGE_MAX_OUTPUT_BYTES
  );
}

/**
 * Garantiza compresión/redimensionado en el navegador justo antes de subir.
 * Si el archivo ya es WebP optimizado (p. ej. tras el picker), se reutiliza.
 */
export async function ensureClientCompressedImages(
  files: File[],
): Promise<File[]> {
  const out: File[] = [];

  for (const file of files) {
    if (isAlreadyClientOptimizedImage(file)) {
      out.push(file);
      continue;
    }
    const { file: compressed } = await compressImageForUpload(file);
    out.push(compressed);
  }

  return out;
}
