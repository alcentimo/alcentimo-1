import {
  LEGACY_PWA_CACHE_PREFIXES,
  PWA_REGISTER_IDLE_TIMEOUT_MS,
  PWA_RESET_STORAGE_KEY,
  PWA_RESET_VERSION,
} from "@/lib/pwa/constants";
import {
  getCatalogServiceWorkerScope,
  getCatalogServiceWorkerUrl,
} from "@/lib/pwa/catalog-sw-paths";

function isLegacyCacheName(name: string): boolean {
  return LEGACY_PWA_CACHE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}-`) || name.includes(prefix),
  );
}

async function deleteLegacyCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.filter(isLegacyCacheName).map((cacheName) => caches.delete(cacheName)),
  );
}

function scheduleIdleTask(task: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: PWA_REGISTER_IDLE_TIMEOUT_MS });
    return;
  }

  window.setTimeout(task, PWA_REGISTER_IDLE_TIMEOUT_MS);
}

async function runBackgroundRegistration(storeSlug: string): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(PWA_RESET_STORAGE_KEY);
    const needsReset = storedVersion !== PWA_RESET_VERSION;

    if (needsReset) {
      await deleteLegacyCaches();
      localStorage.setItem(PWA_RESET_STORAGE_KEY, PWA_RESET_VERSION);
    }

    void navigator.serviceWorker
      .register(getCatalogServiceWorkerUrl(storeSlug), {
        scope: getCatalogServiceWorkerScope(storeSlug),
        updateViaCache: "none",
      })
      .catch(() => {
        // Fallback: SW raíz con scope del catálogo (Chrome lo permite).
        void navigator.serviceWorker
          .register("/sw.js", {
            scope: getCatalogServiceWorkerScope(storeSlug),
            updateViaCache: "none",
          })
          .catch(() => {
            // El catálogo funciona sin SW.
          });
      });
  } catch {
    // El catálogo funciona sin SW; offline es mejora progresiva.
  }
}

/**
 * Registra el SW del catálogo en segundo plano.
 * Usa /c/{slug}/sw.js para que Chrome detecte la PWA en el subdirectorio.
 */
export function scheduleCatalogServiceWorker(storeSlug: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!window.isSecureContext) {
    return;
  }

  const normalizedSlug = storeSlug.trim().toLowerCase();
  if (!normalizedSlug) return;

  const start = () => {
    scheduleIdleTask(() => {
      void runBackgroundRegistration(normalizedSlug);
    });
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  window.addEventListener("load", start, { once: true });
}

/** Registro inmediato para criterios de instalabilidad de Chrome. */
export function registerCatalogServiceWorkerForInstall(storeSlug: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development" || !window.isSecureContext) {
    return;
  }

  const normalizedSlug = storeSlug.trim().toLowerCase();
  if (!normalizedSlug) return;

  void navigator.serviceWorker
    .register(getCatalogServiceWorkerUrl(normalizedSlug), {
      scope: getCatalogServiceWorkerScope(normalizedSlug),
      updateViaCache: "none",
    })
    .catch(() => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: getCatalogServiceWorkerScope(normalizedSlug),
        updateViaCache: "none",
      });
    });
}
