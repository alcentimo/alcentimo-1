/* Custom admin SW handlers (bundled by next-pwa into public/sw.js). */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data ? event.data.text() : "" };
    } catch {
      data = {};
    }
  }

  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title
      : "Nuevo pedido";
  const body =
    typeof data.body === "string" && data.body.trim()
      ? data.body
      : "Tienes un nuevo pedido en tu tienda.";
  const url =
    typeof data.url === "string" && data.url.trim()
      ? data.url
      : "/dashboard/pedidos";
  const tag =
    typeof data.tag === "string" && data.tag.trim()
      ? data.tag
      : "alcentimo-new-order";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url },
      tag,
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/dashboard/pedidos";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client && String(client.url).includes("/dashboard")) {
            if ("navigate" in client && typeof client.navigate === "function") {
              return client.navigate(targetUrl).then(() => client.focus());
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
