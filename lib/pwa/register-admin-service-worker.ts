import {
  ADMIN_PWA_RESET_STORAGE_KEY,
  LEGACY_ADMIN_PWA_CACHE_PREFIXES,
  PWA_ADMIN_RESET_VERSION,
  PWA_REGISTER_IDLE_TIMEOUT_MS,
  PWA_SW_SCOPE,
  PWA_SW_URL,
} from "@/lib/pwa/constants";

function isAdminLegacyCacheName(name: string): boolean {
  return LEGACY_ADMIN_PWA_CACHE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}-`) || name.includes(prefix),
  );
}

async function deleteAdminLegacyCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.filter(isAdminLegacyCacheName).map((cacheName) => caches.delete(cacheName)),
  );
}

function scheduleIdleTask(task: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: PWA_REGISTER_IDLE_TIMEOUT_MS });
    return;
  }

  window.setTimeout(task, PWA_REGISTER_IDLE_TIMEOUT_MS);
}

async function runAdminRegistration(): Promise<void> {
  const storedVersion = localStorage.getItem(ADMIN_PWA_RESET_STORAGE_KEY);
  const needsReset = storedVersion !== PWA_ADMIN_RESET_VERSION;

  if (needsReset) {
    await deleteAdminLegacyCaches();
    localStorage.setItem(ADMIN_PWA_RESET_STORAGE_KEY, PWA_ADMIN_RESET_VERSION);
  }

  void navigator.serviceWorker
    .register(PWA_SW_URL, {
      scope: PWA_SW_SCOPE,
      updateViaCache: "none",
    })
    .catch(() => {
      // El panel funciona sin SW.
    });
}

/** SW del dueño (Alcentimo Admin) — solo en / y /dashboard. */
export function scheduleAdminServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development" || !window.isSecureContext) {
    return;
  }

  const start = () => {
    scheduleIdleTask(() => {
      void runAdminRegistration();
    });
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  window.addEventListener("load", start, { once: true });
}

export function registerAdminServiceWorkerForInstall(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV === "development" || !window.isSecureContext) {
    return;
  }

  void navigator.serviceWorker.register(PWA_SW_URL, {
    scope: PWA_SW_SCOPE,
    updateViaCache: "none",
  });
}
