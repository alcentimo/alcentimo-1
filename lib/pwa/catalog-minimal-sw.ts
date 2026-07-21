import { PWA_CATALOG_RESET_VERSION } from "@/lib/pwa/constants";

/**
 * Service Worker del catálogo público:
 * - Cumple criterios de instalabilidad (controla la página)
 * - Caché básica de assets estáticos y shell de navegación
 * - Aislado por tienda (no comparte precache con el panel admin)
 */
export function buildCatalogMinimalServiceWorker(storeSlug: string): string {
  const slug = JSON.stringify(storeSlug.trim().toLowerCase());
  const cacheVersion = JSON.stringify(PWA_CATALOG_RESET_VERSION);
  const cacheNameExpr = `\`alcentimo-catalog-\${STORE_SLUG}-v\${CACHE_VERSION}\``;

  return `
const STORE_SLUG = ${slug};
const CACHE_VERSION = ${cacheVersion};
const CACHE_NAME = ${cacheNameExpr};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => {
            if (
              name.startsWith("workbox-precache") ||
              name.startsWith("workbox-runtime") ||
              name.startsWith("alcentimo-admin-")
            ) {
              return true;
            }
            if (name.startsWith("alcentimo-catalog-" + STORE_SLUG + "-")) {
              return name !== CACHE_NAME;
            }
            return false;
          })
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

function isCacheableRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/manifest.json")) {
    return false;
  }
  if (url.pathname.startsWith("/api/")) return false;
  return true;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|gif)$/i.test(url.pathname)
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isCacheableRequest(request)) {
    return;
  }

  const url = new URL(request.url);
  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
// catalog-sw:${slug}:${cacheVersion}
`.trim();
}
