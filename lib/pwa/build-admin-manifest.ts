import { PWA_ADMIN_IDENTITY_VERSION } from "@/lib/pwa/constants";
import {
  BRAND_PWA_ICON_192_PATH,
  BRAND_PWA_ICON_512_PATH,
} from "@/lib/brand/assets";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type { WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** PWA del dueño: panel Alcentimo (scope /, start en dashboard). */
export function buildAdminWebManifest(
  origin?: string,
  platformSettings?: Pick<PlatformSettings, "platformName" | "tagline">,
): WebAppManifest {
  const base = normalizeOrigin(origin ?? getSiteUrl());
  const icon192 = `${base}${BRAND_PWA_ICON_192_PATH}`;
  const icon512 = `${base}${BRAND_PWA_ICON_512_PATH}`;
  const appName = platformSettings?.platformName?.trim() || "Alcentimo";

  return {
    id: `${base}/?pwa_id=admin-${PWA_ADMIN_IDENTITY_VERSION}`,
    name: `${appName} Admin`,
    short_name: appName,
    description:
      platformSettings?.tagline?.trim() ||
      "Panel de administración de inventario y catálogo digital",
    start_url: "/dashboard/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

export function getAdminManifestPath(): string {
  return "/manifest.json";
}
