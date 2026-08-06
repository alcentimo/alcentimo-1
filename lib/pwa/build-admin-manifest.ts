import {
  PWA_ADMIN_BACKGROUND_COLOR,
  PWA_ADMIN_IDENTITY_VERSION,
  PWA_ADMIN_START_URL,
  PWA_ADMIN_THEME_COLOR,
} from "@/lib/pwa/constants";
import {
  BRAND_PWA_ICON_192_PATH,
  BRAND_PWA_ICON_512_PATH,
  BRAND_PWA_ICON_MASKABLE_192_PATH,
  BRAND_PWA_ICON_MASKABLE_512_PATH,
} from "@/lib/brand/assets";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type { WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** PWA del dueño: panel Alcentimo (scope /, start en login PWA). */
export function buildAdminWebManifest(
  origin?: string,
  platformSettings?: Pick<PlatformSettings, "platformName" | "tagline">,
): WebAppManifest {
  const base = normalizeOrigin(origin ?? getSiteUrl());
  const icon192 = `${base}${BRAND_PWA_ICON_192_PATH}`;
  const icon512 = `${base}${BRAND_PWA_ICON_512_PATH}`;
  const iconMaskable192 = `${base}${BRAND_PWA_ICON_MASKABLE_192_PATH}`;
  const iconMaskable512 = `${base}${BRAND_PWA_ICON_MASKABLE_512_PATH}`;
  const appName = platformSettings?.platformName?.trim() || "Alcentimo";

  return {
    id: `${base}/?pwa_id=admin-${PWA_ADMIN_IDENTITY_VERSION}`,
    name: `${appName} Admin`,
    short_name: appName,
    description:
      platformSettings?.tagline?.trim() ||
      "Panel de administración de inventario y catálogo digital",
    start_url: PWA_ADMIN_START_URL,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait-primary",
    background_color: PWA_ADMIN_BACKGROUND_COLOR,
    theme_color: PWA_ADMIN_THEME_COLOR,
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
        src: iconMaskable192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: iconMaskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}

export function getAdminManifestPath(): string {
  return "/manifest.json";
}
