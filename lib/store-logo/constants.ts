export const STORE_LOGO_RECOMMENDED_SIZE = 512;
export const STORE_LOGO_MIN_SIZE = 128;
export const STORE_LOGO_MAX_SIZE = 2048;
export const STORE_LOGO_ASPECT_TOLERANCE = 0.01;

export const STORE_LOGO_HELP_TEXT =
  "Imagen cuadrada recomendada (PNG, JPG o GIF animado, ideal 512×512 px). Los GIF conservan la animación; la PWA usa un fotograma estático.";

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
