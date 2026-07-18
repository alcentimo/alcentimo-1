import {
  LEGACY_PWA_CACHE_PREFIXES,
  PWA_RESET_STORAGE_KEY,
  PWA_RESET_VERSION,
  PWA_SW_SCOPE,
  PWA_SW_URL,
} from "@/lib/pwa/constants";

function isLegacyCacheName(name: string): boolean {
  return LEGACY_PWA_CACHE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}-`) || name.includes(prefix),
  );
}

async function unregisterAllServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function deleteLegacyCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.filter(isLegacyCacheName).map((cacheName) => caches.delete(cacheName)),
  );
}

async function registerFreshServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.register(PWA_SW_URL, {
    scope: PWA_SW_SCOPE,
    updateViaCache: "none",
  });

  if (registration.waiting && registration.active) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  await registration.update();
}

/**
 * Limpia SW/cachés obsoletos (una vez por versión) y registra el worker actual.
 * Evita pantallas en blanco por HTML/JS cacheados de despliegues anteriores.
 */
export async function registerCatalogServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!window.isSecureContext) {
    return;
  }

  try {
    const storedVersion = localStorage.getItem(PWA_RESET_STORAGE_KEY);
    const needsReset = storedVersion !== PWA_RESET_VERSION;

    if (needsReset) {
      await unregisterAllServiceWorkers();
      await deleteLegacyCaches();
      localStorage.setItem(PWA_RESET_STORAGE_KEY, PWA_RESET_VERSION);
    }

    await registerFreshServiceWorker();
  } catch {
    // El catálogo funciona sin SW; offline es mejora progresiva.
  }
}
