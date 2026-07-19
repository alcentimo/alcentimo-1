/** Configuración compartida para imágenes de producto en catálogo. */

export const PRODUCT_IMAGE_ASPECT_CLASS = "aspect-square";

/** Dimensiones recomendadas al capturar (cuadrado, hasta 1024px). */
export const PRODUCT_IMAGE_RECOMMENDED_WIDTH = 1024;
export const PRODUCT_IMAGE_RECOMMENDED_HEIGHT = 1024;

export const PRODUCT_IMAGE_RECOMMENDED_HINT =
  "Formato recomendado: hasta 1024×1024px (cuadrado o rectangular)";

/** Texto de ayuda sobre la optimización automática (cliente + servidor). */
export const PRODUCT_IMAGE_OPTIMIZE_HINT =
  "Se optimiza a WebP (máx. 1024×1024, calidad ~80%, ~80–120 KB) para nitidez en todos los dispositivos.";

/** Texto sobre recorte automático 1:1. */
export const PRODUCT_IMAGE_CROP_HINT =
  "Recorte automático al centro (1:1). En fotos horizontales se ajustan los lados sin que tengas que editar.";

/** Tamaño máximo del archivo final tras optimizar (120 KB). */
export const PRODUCT_IMAGE_MAX_OUTPUT_BYTES = 120 * 1024;

/** Peso objetivo inferior recomendado (evita sobre-compresión con artefactos). */
export const PRODUCT_IMAGE_MIN_OUTPUT_BYTES = 80 * 1024;

/** Entrada máxima antes de comprimir en cliente (se optimiza automáticamente). */
export const PRODUCT_IMAGE_MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Ancho/lado largo máximo tras redimensionar (mantiene proporción). */
export const PRODUCT_IMAGE_MAX_DIMENSION = 1024;

/** Calidad WebP inicial (0–1). */
export const PRODUCT_IMAGE_WEBP_QUALITY = 0.8;

/** Peso objetivo ideal para equilibrio nitidez/rendimiento. */
export const PRODUCT_IMAGE_TARGET_BYTES = 100 * 1024;

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
