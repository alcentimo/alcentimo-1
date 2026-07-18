import { PWA_ADMIN_IDENTITY_VERSION } from "@/lib/pwa/constants";
import type { WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** PWA del dueño: panel Alcentimo (scope /, start en dashboard). */
export function buildAdminWebManifest(origin?: string): WebAppManifest {
  const base = normalizeOrigin(origin ?? getSiteUrl());

  return {
    id: `${base}/?pwa_id=admin-${PWA_ADMIN_IDENTITY_VERSION}`,
    name: "Alcentimo Admin",
    short_name: "Alcentimo",
    description: "Panel de administración de inventario y catálogo digital",
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
        src: `${base}/icon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icon-512x512.png`,
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
