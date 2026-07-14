/** Configuración compartida para imágenes de producto en catálogo. */

export const PRODUCT_IMAGE_ASPECT_CLASS = "aspect-[4/5]";

/** Dimensiones recomendadas al capturar (4:5 vertical). */
export const PRODUCT_IMAGE_RECOMMENDED_WIDTH = 1080;
export const PRODUCT_IMAGE_RECOMMENDED_HEIGHT = 1350;

export const PRODUCT_IMAGE_RECOMMENDED_HINT =
  "Formato recomendado: 1080×1350px (4:5)";

/** Texto de ayuda sobre la optimización automática en el cliente. */
export const PRODUCT_IMAGE_OPTIMIZE_HINT =
  "Se optimiza automáticamente a WebP (máx. 800px, <40 KB) para carga rápida en móvil.";

/** Tamaño máximo del archivo final tras optimizar (40 KB). */
export const PRODUCT_IMAGE_MAX_OUTPUT_BYTES = 40 * 1024;

/** Entrada máxima antes de comprimir en cliente (se optimiza automáticamente). */
export const PRODUCT_IMAGE_MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Ancho/lado largo máximo tras redimensionar (mantiene proporción). */
export const PRODUCT_IMAGE_MAX_DIMENSION = 800;

/** Calidad WebP inicial en el navegador (0–1). */
export const PRODUCT_IMAGE_WEBP_QUALITY = 0.75;

/** Objetivo de peso para carga rápida en móvil. */
export const PRODUCT_IMAGE_TARGET_BYTES = 40 * 1024;

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
