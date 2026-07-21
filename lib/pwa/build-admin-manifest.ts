import { PWA_ADMIN_IDENTITY_VERSION } from "@/lib/pwa/constants";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type { WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function resolvePlatformIconUrl(
  base: string,
  customUrl: string | null | undefined,
  fallbackPath: string,
): string {
  if (customUrl?.trim()) return customUrl.trim();
  return `${base}${fallbackPath}`;
}

/** PWA del dueño: panel Alcentimo (scope /, start en dashboard). */
export function buildAdminWebManifest(
  origin?: string,
  platformSettings?: Pick<PlatformSettings, "platformName" | "tagline" | "pwaIcon192Url" | "pwaIcon512Url">,
): WebAppManifest {
  const base = normalizeOrigin(origin ?? getSiteUrl());
  const icon192 = resolvePlatformIconUrl(
    base,
    platformSettings?.pwaIcon192Url,
    "/icon-192x192.png",
  );
  const icon512 = resolvePlatformIconUrl(
    base,
    platformSettings?.pwaIcon512Url,
    "/icon-512x512.png",
  );
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
