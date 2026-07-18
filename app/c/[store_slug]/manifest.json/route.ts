import { getPublicStoreBySlug } from "@/lib/stores";
import {
  buildStoreCatalogPwaPaths,
  buildStoreWebManifest,
  formatPwaManifestName,
  formatPwaManifestShortName,
} from "@/lib/pwa/build-store-manifest";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";

interface CatalogManifestRouteProps {
  params: Promise<{ store_slug: string }>;
}

export async function GET(_request: Request, { params }: CatalogManifestRouteProps) {
  const { store_slug: storeSlug } = await params;
  const origin = await getRequestOrigin();
  const store = await getPublicStoreBySlug(storeSlug);

  const manifest = store
    ? buildStoreWebManifest(store, origin)
    : (() => {
        const paths = buildStoreCatalogPwaPaths(storeSlug, origin);
        return {
          id: paths.id,
          name: formatPwaManifestName("Catálogo"),
          short_name: formatPwaManifestShortName("Catálogo"),
          description: "Catálogo de tienda",
          start_url: paths.startUrl,
          scope: paths.scope,
          display: "standalone",
          orientation: "portrait-primary",
          background_color: "#ffffff",
          theme_color: "#0d9488",
          lang: "es",
          icons: [],
        };
      })();

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
