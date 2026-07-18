import { getPublicStoreBySlug } from "@/lib/stores";
import {
  buildFallbackStoreWebManifest,
  buildStoreWebManifest,
} from "@/lib/pwa/build-store-manifest";
import { getStoreManifestTheme } from "@/lib/pwa/get-store-manifest-theme";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { createManifestJsonResponse } from "@/lib/pwa/manifest-response";

interface CatalogManifestRouteProps {
  params: Promise<{ store_slug: string }>;
}

/** Manifiesto exclusivo del cliente final por tienda. */
export async function GET(_request: Request, { params }: CatalogManifestRouteProps) {
  const { store_slug: storeSlug } = await params;
  const origin = await getRequestOrigin();
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return createManifestJsonResponse(buildFallbackStoreWebManifest(storeSlug, origin));
  }

  const theme = await getStoreManifestTheme(store);
  return createManifestJsonResponse(buildStoreWebManifest(store, origin, theme));
}
