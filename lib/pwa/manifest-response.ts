import type { WebAppManifest } from "@/lib/pwa/types";

export function createManifestJsonResponse(manifest: WebAppManifest): Response {
  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
