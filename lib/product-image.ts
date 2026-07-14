/** Configuración compartida para imágenes de producto en catálogo. */

export const PRODUCT_IMAGE_ASPECT_CLASS = "aspect-[4/5]";

/** Dimensiones recomendadas (4:5 vertical). */
export const PRODUCT_IMAGE_RECOMMENDED_WIDTH = 1080;
export const PRODUCT_IMAGE_RECOMMENDED_HEIGHT = 1350;

export const PRODUCT_IMAGE_RECOMMENDED_HINT =
  "Formato recomendado: 1080×1350px (4:5)";

/** Tamaño máximo del archivo final tras optimizar (2 MB). */
export const PRODUCT_IMAGE_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

/** Entrada máxima antes de comprimir en cliente (se optimiza automáticamente). */
export const PRODUCT_IMAGE_MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Lado largo máximo tras redimensionar. */
export const PRODUCT_IMAGE_MAX_DIMENSION = 1350;

/** Objetivo de peso para carga rápida en móvil (preferido tras comprimir). */
export const PRODUCT_IMAGE_TARGET_BYTES = 600 * 1024;

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
