import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Registro manual en CatalogAppShell (App Router).
  register: false,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // Evita cachear "/" o start_url genérico que compite con el catálogo por tienda.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: false,
  fallbacks: {
    document: "/offline.html",
  },
  runtimeCaching: [
    {
      urlPattern: ({ request, url }: { request: Request; url: URL }) =>
        request.mode === "navigate" && url.pathname.startsWith("/c/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "catalog-navigations-v3",
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "next-static-assets-v3",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "next-data-v3",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) =>
        url.pathname.startsWith("/c/") &&
        /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "catalog-images-v3",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
  ],
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
