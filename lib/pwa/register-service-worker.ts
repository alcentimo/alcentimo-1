import {
  LEGACY_PWA_CACHE_PREFIXES,
  PWA_REGISTER_IDLE_TIMEOUT_MS,
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

async function runBackgroundRegistration(): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(PWA_RESET_STORAGE_KEY);
    const needsReset = storedVersion !== PWA_RESET_VERSION;

    if (needsReset) {
      // Solo limpiar cachés legacy; no desregistrar el SW activo (evita bucles/esperas al abrir).
      await deleteLegacyCaches();
      localStorage.setItem(PWA_RESET_STORAGE_KEY, PWA_RESET_VERSION);
    }

    // Fire-and-forget: no esperar update()/ready para no bloquear la UI.
    void navigator.serviceWorker
      .register(PWA_SW_URL, {
        scope: PWA_SW_SCOPE,
        updateViaCache: "none",
      })
      .catch(() => {
        // El catálogo funciona sin SW.
      });
  } catch {
    // El catálogo funciona sin SW; offline es mejora progresiva.
  }
}

/**
 * Registra el SW en segundo plano tras la primera pintura.
 * El start_url y la navegación inicial no dependen del SW.
 */
export function scheduleCatalogServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!window.isSecureContext) {
    return;
  }

  const start = () => {
    scheduleIdleTask(() => {
      void runBackgroundRegistration();
    });
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  window.addEventListener("load", start, { once: true });
}
