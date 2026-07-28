export const STORE_LOGO_RECOMMENDED_SIZE = 512;
export const STORE_LOGO_MIN_SIZE = 128;
export const STORE_LOGO_MAX_SIZE = 2048;
export const STORE_LOGO_ASPECT_TOLERANCE = 0.01;

export const STORE_LOGO_HELP_TEXT =
  "Imagen cuadrada recomendada (PNG o JPG, ideal 512×512 px). También se usa como icono de la PWA del catálogo.";

export const STORE_LOGO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

export const STORE_LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export const STORE_LOGO_PWA_SIZES = [192, 512] as const;
