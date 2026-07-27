import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { getAdminManifestPath } from "@/lib/pwa/build-admin-manifest";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { PlatformSettingsProvider } from "@/components/providers/PlatformSettingsProvider";
import { GoogleOAuthProvider } from "@/components/providers/GoogleOAuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

function resolveMetadataIconUrl(
  customUrl: string | null | undefined,
  fallbackPath: string,
): string {
  return customUrl?.trim() || fallbackPath;
}

export async function generateMetadata(): Promise<Metadata> {
  const platformSettings = await fetchPlatformSettings();
  const icon192 = resolveMetadataIconUrl(
    platformSettings.pwaIcon192Url,
    "/icon-192x192.png",
  );
  const icon512 = resolveMetadataIconUrl(
    platformSettings.pwaIcon512Url,
    "/icon-512x512.png",
  );

  return {
    title: `${platformSettings.platformName.toLowerCase()} — Inventario y catálogo digital`,
    description:
      platformSettings.tagline ||
      "Software de gestión de inventario y catálogo digital para comerciantes venezolanos. Precios en USD con conversión automática a bolívares.",
    applicationName: `${platformSettings.platformName} Admin`,
    manifest: getAdminManifestPath(),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: `${platformSettings.platformName} Admin`,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: icon192, sizes: "192x192", type: "image/png" },
        { url: icon512, sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      shortcut: "/favicon.ico",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#134e4a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const platformSettings = await fetchPlatformSettings();

  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <PlatformSettingsProvider settings={platformSettings}>
          <GoogleOAuthProvider>{children}</GoogleOAuthProvider>
        </PlatformSettingsProvider>
      </body>
    </html>
  );
}
