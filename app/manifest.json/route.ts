import { getPublicStoreBySlug } from "@/lib/stores";
import {
  buildFallbackStoreWebManifest,
  buildStoreWebManifest,
} from "@/lib/pwa/build-store-manifest";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import {
  createManifestJsonResponse,
  resolveManifestStoreSlug,
} from "@/lib/pwa/manifest-response";

export async function GET(request: Request) {
  const origin = await getRequestOrigin();
  const storeSlug = resolveManifestStoreSlug(request);

  if (!storeSlug) {
    const fallback = buildFallbackStoreWebManifest("catalogo", origin);
    return createManifestJsonResponse(fallback);
  }

  const store = await getPublicStoreBySlug(storeSlug);
  const manifest = store
    ? buildStoreWebManifest(store, origin)
    : buildFallbackStoreWebManifest(storeSlug, origin);

  return createManifestJsonResponse(manifest);
}
