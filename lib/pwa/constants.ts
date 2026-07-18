/** Incrementar tras cambios de estrategia SW admin. */
export const PWA_ADMIN_RESET_VERSION = "1";

/** Incrementar tras cambios de estrategia SW catálogo cliente. */
export const PWA_CATALOG_RESET_VERSION = "9";

/** Identidad PWA admin (Alcentimo Admin). */
export const PWA_ADMIN_IDENTITY_VERSION = "1";

/** Identidad base PWA tienda cliente. */
export const PWA_STORE_IDENTITY_VERSION = "5";

export const PWA_SW_URL = "/sw.js";

export const PWA_SW_SCOPE = "/";

/** Retraso antes de registrar SW (ms): la UI debe pintar primero. */
export const PWA_REGISTER_IDLE_TIMEOUT_MS = 500;

export const ADMIN_PWA_RESET_STORAGE_KEY = "alcentimo_pwa_admin_reset_version";

export const CATALOG_PWA_RESET_STORAGE_KEY = "alcentimo_pwa_catalog_reset_version";

/** Cachés legacy del panel admin (workbox global). */
export const LEGACY_ADMIN_PWA_CACHE_PREFIXES = [
  "workbox-precache",
  "workbox-runtime",
  "alcentimo-admin-",
  "start-url",
  "others",
  "next-static-assets",
  "next-data",
] as const;

/** Cachés legacy del catálogo cliente. */
export const LEGACY_CATALOG_PWA_CACHE_PREFIXES = [
  "catalog-navigations",
  "public-catalog-pages",
  "catalog-images",
  "alcentimo-catalog-",
] as const;
