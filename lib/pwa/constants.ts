/** Incrementar tras cambios de estrategia SW para forzar limpieza en clientes. */
export const PWA_RESET_VERSION = "5";

/** Nueva identidad PWA: cambiar fuerza al móvil a tratarla como app distinta. */
export const PWA_IDENTITY_VERSION = "4";

export const PWA_SW_URL = "/sw.js";

export const PWA_SW_SCOPE = "/";

/** Retraso antes de registrar SW (ms): la UI debe pintar primero. */
export const PWA_REGISTER_IDLE_TIMEOUT_MS = 500;

/** Cachés legacy/workbox que pueden servir HTML o JS obsoletos (pantalla en blanco). */
export const LEGACY_PWA_CACHE_PREFIXES = [
  "catalog-navigations",
  "public-catalog-pages",
  "start-url",
  "others",
  "next-static-assets",
  "next-data",
  "workbox-precache",
  "workbox-runtime",
] as const;

export const PWA_RESET_STORAGE_KEY = "alcentimo_pwa_reset_version";
