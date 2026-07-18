import type { StoreWebManifest } from "@/lib/pwa/build-store-manifest";

export function createManifestJsonResponse(manifest: StoreWebManifest): Response {
  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}

/** Resuelve el slug de tienda para /manifest.json (query, referer o cookie de visita). */
export function resolveManifestStoreSlug(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("store")?.trim().toLowerCase();
  if (fromQuery) return fromQuery;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererPath = new URL(referer).pathname;
      const match = refererPath.match(/^\/c\/([^/]+)/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]).trim().toLowerCase();
      }
    } catch {
      // Referer inválido: continuar con cookies.
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookieMatches = [
    ...cookieHeader.matchAll(/(?:^|;\s*)alcentimo_cv_([a-z0-9-]+)=/gi),
  ];

  if (cookieMatches.length === 1 && cookieMatches[0]?.[1]) {
    return cookieMatches[0][1].trim().toLowerCase();
  }

  return null;
}
