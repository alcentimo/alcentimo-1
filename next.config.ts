import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Registro manual en CatalogAppShell (App Router), diferido tras la primera pintura.
  register: false,
  skipWaiting: true,
  // No tomar control de la pestaña actual: evita esperas al abrir desde el icono PWA.
  clientsClaim: false,
  cleanupOutdatedCaches: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: false,
  // Sin reglas runtime: navegación HTML y JS cargan directo desde red (sin espera de caché SW).
  runtimeCaching: [],
});

const oauthSecurityHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  turbopack: {},
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  // Disponible en middleware (Edge) tras el build en Vercel.
  env: {
    SUPPORT_ADMIN_EMAILS: process.env.SUPPORT_ADMIN_EMAILS ?? "",
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
    serverActions: {
      // createProduct envía multipart/form-data con imagen (hasta ~12 MB en cliente).
      bodySizeLimit: "10mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "**.mlstatic.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: oauthSecurityHeaders,
      },
      {
        source: "/api/integrations/:path*",
        headers: oauthSecurityHeaders,
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
      {
        source: "/api/webhooks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
      {
        source: "/api/support/:path*",
        headers: oauthSecurityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
      {
        source: "/c/:store_slug/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/mensajes",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/mensajes/:path*",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default withPWA(nextConfig);
