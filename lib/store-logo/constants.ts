export const STORE_LOGO_RECOMMENDED_SIZE = 512;
export const STORE_LOGO_MIN_SIZE = 128;
export const STORE_LOGO_MAX_SIZE = 2048;
export const STORE_LOGO_ASPECT_TOLERANCE = 0.01;

/** Límite de peso para logos estáticos (PNG/JPG/WebP). */
export const STORE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** Límite de peso más amplio para GIF animados (más fotogramas = más KB). */
export const STORE_LOGO_GIF_MAX_BYTES = 5 * 1024 * 1024;

export const STORE_LOGO_HELP_TEXT =
  "Imagen cuadrada recomendada (PNG, JPG o GIF animado, ideal 512×512 px). Los GIF conservan la animación (hasta 5 MB); la PWA usa un fotograma estático.";

export const STORE_LOGO_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif";

export const STORE_LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const;

export const STORE_LOGO_PWA_SIZES = [192, 512] as const;
