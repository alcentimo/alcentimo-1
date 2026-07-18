/** SW mínimo del catálogo: sin precache compartido con el panel admin. */
export function buildCatalogMinimalServiceWorker(storeSlug: string): string {
  const slug = storeSlug.trim().toLowerCase();

  return `
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith("workbox-precache") ||
            name.startsWith("workbox-runtime") ||
            name.startsWith("alcentimo-admin-")
          )
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
// catalog-sw:${slug}
`.trim();
}
