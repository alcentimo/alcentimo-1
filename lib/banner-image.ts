/** Configuración compartida para banners promocionales del catálogo. */

export type BannerImageVariant = "mobile" | "desktop";

export const BANNER_DISPLAY_HEIGHT_MOBILE_PX = 168;
export const BANNER_DISPLAY_HEIGHT_DESKTOP_PX = 250;

/** Proporción panorámica estándar del banner en catálogo (2.5:1). */
export const BANNER_DISPLAY_ASPECT_RATIO = 2.5;

export const BANNER_MOBILE_MAX_WIDTH = 960;
export const BANNER_MOBILE_MAX_HEIGHT = 384;

export const BANNER_DESKTOP_MAX_WIDTH = 1600;
export const BANNER_DESKTOP_MAX_HEIGHT = 400;

/** Peso máximo del archivo final tras optimizar. */
export const BANNER_MAX_OUTPUT_BYTES = 100 * 1024;

export const BANNER_MAX_INPUT_BYTES = 12 * 1024 * 1024;

export const BANNER_WEBP_QUALITY = 0.82;

export const BANNER_OPTIMIZE_HINT =
  "Se optimiza a WebP (móvil ~960×384, escritorio ~1600×400, ≤100 KB) para carga rápida.";

export function getBannerMaxDimensions(variant: BannerImageVariant): {
  maxWidth: number;
  maxHeight: number;
} {
  if (variant === "desktop") {
    return {
      maxWidth: BANNER_DESKTOP_MAX_WIDTH,
      maxHeight: BANNER_DESKTOP_MAX_HEIGHT,
    };
  }

  return {
    maxWidth: BANNER_MOBILE_MAX_WIDTH,
    maxHeight: BANNER_MOBILE_MAX_HEIGHT,
  };
}

export function getBannerMaxDimension(variant: BannerImageVariant): number {
  const { maxWidth, maxHeight } = getBannerMaxDimensions(variant);
  return Math.max(maxWidth, maxHeight);
}
