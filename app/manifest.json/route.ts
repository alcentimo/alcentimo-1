import { buildAdminWebManifest } from "@/lib/pwa/build-admin-manifest";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { createManifestJsonResponse } from "@/lib/pwa/manifest-response";

/** Manifiesto exclusivo de Alcentimo Admin (dueño). Nunca sirve datos de tienda. */
export async function GET() {
  const origin = await getRequestOrigin();
  const platformSettings = await fetchPlatformSettings();
  return createManifestJsonResponse(
    buildAdminWebManifest(origin, platformSettings),
  );
}
