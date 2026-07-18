import { buildCatalogMinimalServiceWorker } from "@/lib/pwa/catalog-minimal-sw";
import { getCatalogServiceWorkerScope } from "@/lib/pwa/catalog-sw-paths";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { SERVICE_WORKER_RESPONSE_HEADERS } from "@/lib/pwa/service-worker-script";

interface CatalogServiceWorkerRouteProps {
  params: Promise<{ store_slug: string }>;
}

/** SW aislado del catálogo cliente (sin precache compartido con admin). */
export async function GET(_request: Request, { params }: CatalogServiceWorkerRouteProps) {
  const { store_slug: storeSlug } = await params;
  const origin = await getRequestOrigin();
  const scope = getCatalogServiceWorkerScope(storeSlug, origin);
  const script = buildCatalogMinimalServiceWorker(storeSlug);

  return new Response(script, {
    headers: {
      ...SERVICE_WORKER_RESPONSE_HEADERS,
      "Service-Worker-Allowed": scope,
    },
  });
}
