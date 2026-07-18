import type { Store } from "@/lib/database.types";

export interface StoreManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

export interface StoreWebManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  background_color: string;
  theme_color: string;
  lang: string;
  icons: StoreManifestIcon[];
}

/** Rutas PWA relativas al origen — requerido para que el acceso directo abra el catálogo. */
export function buildStoreCatalogPwaPaths(storeSlug: string) {
  const slug = storeSlug.trim().toLowerCase();
  const scope = `/c/${slug}/`;

  return {
    id: scope,
    scope,
    // Query param no afecta el scope; ayuda a distinguir instalaciones en analíticas.
    startUrl: `${scope}?source=pwa`,
  };
}

export function buildStoreWebManifest(store: Store): StoreWebManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(store.slug);

  const icons: StoreManifestIcon[] = [];

  if (store.pwa_icon_192_url) {
    icons.push({
      src: store.pwa_icon_192_url,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    });
  }

  if (store.pwa_icon_512_url) {
    icons.push(
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    );
  }

  if (icons.length === 0 && store.logo_url) {
    icons.push({
      src: store.logo_url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    });
  }

  return {
    id,
    name: store.name,
    short_name: store.name.slice(0, 12),
    description: `Catálogo y pedidos de ${store.name}`,
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons,
  };
}

export function getStoreManifestPath(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/manifest.webmanifest`;
}
