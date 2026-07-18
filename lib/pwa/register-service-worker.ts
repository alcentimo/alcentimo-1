import {
  CATALOG_PWA_RESET_STORAGE_KEY,
  LEGACY_CATALOG_PWA_CACHE_PREFIXES,
  PWA_CATALOG_RESET_VERSION,
  PWA_REGISTER_IDLE_TIMEOUT_MS,
} from "@/lib/pwa/constants";
import {
  getCatalogServiceWorkerAbsoluteUrl,
  getCatalogServiceWorkerScope,
  getCatalogServiceWorkerUrl,
} from "@/lib/pwa/catalog-sw-paths";

function resolveCatalogServiceWorkerRegistration(storeSlug: string): {
  scriptUrl: string;
  scope: string;
} {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const scope = getCatalogServiceWorkerScope(normalizedSlug);

  if (typeof window !== "undefined") {
    return {
      scriptUrl: getCatalogServiceWorkerAbsoluteUrl(normalizedSlug, window.location.origin),
      scope,
    };
  }

  return {
    scriptUrl: getCatalogServiceWorkerUrl(normalizedSlug),
    scope,
  };
}

function isCatalogLegacyCacheName(name: string): boolean {
  return LEGACY_CATALOG_PWA_CACHE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}-`) || name.includes(prefix),
  );
}

async function deleteCatalogLegacyCaches(storeSlug: string): Promise<void> {
  const cacheNames = await caches.keys();
  const slugPrefix = `alcentimo-catalog-${storeSlug.trim().toLowerCase()}-`;

  await Promise.all(
    cacheNames
      .filter(
        (name) =>
          isCatalogLegacyCacheName(name) ||
          name.startsWith(slugPrefix) ||
          name.startsWith("workbox-precache") ||
          name.startsWith("workbox-runtime"),
      )
      .map((cacheName) => caches.delete(cacheName)),
  );
}

function scheduleIdleTask(task: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: PWA_REGISTER_IDLE_TIMEOUT_MS });
    return;
  }

  window.setTimeout(task, PWA_REGISTER_IDLE_TIMEOUT_MS);
}

async function runCatalogRegistration(storeSlug: string): Promise<void> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const storedVersion = localStorage.getItem(CATALOG_PWA_RESET_STORAGE_KEY);
  const needsReset = storedVersion !== PWA_CATALOG_RESET_VERSION;

  if (needsReset) {
    await deleteCatalogLegacyCaches(normalizedSlug);
    localStorage.setItem(CATALOG_PWA_RESET_STORAGE_KEY, PWA_CATALOG_RESET_VERSION);
  }

  const registration = resolveCatalogServiceWorkerRegistration(normalizedSlug);

  void navigator.serviceWorker
    .register(registration.scriptUrl, {
      scope: registration.scope,
      updateViaCache: "none",
    })
    .catch(() => {
      // El catálogo funciona sin SW.
    });
}

/** SW aislado del cliente — scope /c/{slug}/, sin fallback al SW admin. */
export function scheduleCatalogServiceWorker(storeSlug: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development" || !window.isSecureContext) {
    return;
  }

  const normalizedSlug = storeSlug.trim().toLowerCase();
  if (!normalizedSlug) return;

  const start = () => {
    scheduleIdleTask(() => {
      void runCatalogRegistration(normalizedSlug);
    });
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  window.addEventListener("load", start, { once: true });
}

export function registerCatalogServiceWorkerForInstall(storeSlug: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development" || !window.isSecureContext) {
    return;
  }

  const normalizedSlug = storeSlug.trim().toLowerCase();
  if (!normalizedSlug) return;

  const registration = resolveCatalogServiceWorkerRegistration(normalizedSlug);

  void navigator.serviceWorker.register(registration.scriptUrl, {
    scope: registration.scope,
    updateViaCache: "none",
  });
}

/** Desregistra SW admin si el usuario entra al catálogo (evita scope / compartido). */
export async function unregisterAdminServiceWorkerOnCatalog(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => {
          const scriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? "";
          return scriptUrl.endsWith("/sw.js") && !scriptUrl.includes("/c/");
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Ignorar: el catálogo registra su propio SW.
  }
}
