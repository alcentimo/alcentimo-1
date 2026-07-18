import type { Store } from "@/lib/database.types";
import { getSiteUrl } from "@/lib/site-url";

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

export function buildStoreWebManifest(store: Store): StoreWebManifest {
  const siteUrl = getSiteUrl();
  const catalogPath = `/c/${store.slug}`;
  const startUrl = `${siteUrl}${catalogPath}`;
  const scope = `${siteUrl}${catalogPath}`;

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
    id: `${siteUrl}/stores/${store.id}`,
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
  return `/c/${storeSlug}/manifest.json`;
}
