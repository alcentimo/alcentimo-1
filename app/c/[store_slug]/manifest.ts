import type { MetadataRoute } from "next";
import { getPublicStoreBySlug } from "@/lib/stores";
import {
  buildStoreCatalogPwaPaths,
  buildStoreWebManifest,
} from "@/lib/pwa/build-store-manifest";

interface CatalogManifestProps {
  params: Promise<{ store_slug: string }>;
}

/** Manifest nativo de Next.js para /c/[store_slug] — evita conflictos con el manifest global. */
export default async function manifest({
  params,
}: CatalogManifestProps): Promise<MetadataRoute.Manifest> {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    const { id, scope, startUrl } = buildStoreCatalogPwaPaths(storeSlug);
    return {
      id,
      name: "Catálogo",
      short_name: "Catálogo",
      start_url: startUrl,
      scope,
      display: "standalone",
      icons: [],
    };
  }

  const webManifest = buildStoreWebManifest(store);

  return {
    id: webManifest.id,
    name: webManifest.name,
    short_name: webManifest.short_name,
    description: webManifest.description,
    start_url: webManifest.start_url,
    scope: webManifest.scope,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: webManifest.background_color,
    theme_color: webManifest.theme_color,
    lang: webManifest.lang,
    icons: webManifest.icons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      purpose: icon.purpose as "any" | "maskable" | "monochrome",
    })),
  };
}
