import { getPublicStoreBySlug } from "@/lib/stores";
import { buildStoreWebManifest } from "@/lib/pwa/build-store-manifest";

interface CatalogManifestRouteProps {
  params: Promise<{ store_slug: string }>;
}

export async function GET(_request: Request, { params }: CatalogManifestRouteProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return new Response("Not found", { status: 404 });
  }

  const manifest = buildStoreWebManifest(store);

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
