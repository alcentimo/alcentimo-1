import { readRootServiceWorkerScript, rewriteServiceWorkerForCatalogSubpath, SERVICE_WORKER_RESPONSE_HEADERS } from "@/lib/pwa/service-worker-script";

interface CatalogServiceWorkerRouteProps {
  params: Promise<{ store_slug: string }>;
}

export async function GET(_request: Request, { params }: CatalogServiceWorkerRouteProps) {
  await params;

  const script = rewriteServiceWorkerForCatalogSubpath(await readRootServiceWorkerScript());

  return new Response(script, {
    headers: {
      ...SERVICE_WORKER_RESPONSE_HEADERS,
      "Service-Worker-Allowed": "/",
    },
  });
}
