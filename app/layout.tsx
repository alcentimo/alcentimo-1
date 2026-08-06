import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { getAdminManifestPath } from "@/lib/pwa/build-admin-manifest";
import {
  BRAND_APPLE_TOUCH_ICON_PATH,
  BRAND_FAVICON_16_PATH,
  BRAND_FAVICON_32_PATH,
  BRAND_FAVICON_ICO_PATH,
  BRAND_FAVICON_PNG_PATH,
  BRAND_PWA_ICON_192_PATH,
  BRAND_PWA_ICON_512_PATH,
} from "@/lib/brand/assets";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { PlatformSettingsProvider } from "@/components/providers/PlatformSettingsProvider";
import { GoogleOAuthProvider } from "@/components/providers/GoogleOAuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const platformSettings = await fetchPlatformSettings();

  return {
    title: `${platformSettings.platformName.toLowerCase()} — Inventario y catálogo digital`,
    description:
      platformSettings.tagline ||
      "Software de gestión de inventario y catálogo digital para comerciantes venezolanos. Precios en USD con conversión automática a bolívares.",
    applicationName: `${platformSettings.platformName} Admin`,
    manifest: getAdminManifestPath(),
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: `${platformSettings.platformName} Admin`,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: BRAND_FAVICON_PNG_PATH, sizes: "32x32", type: "image/png" },
        { url: BRAND_FAVICON_ICO_PATH, sizes: "48x48" },
        { url: BRAND_FAVICON_16_PATH, sizes: "16x16", type: "image/png" },
        { url: BRAND_FAVICON_32_PATH, sizes: "32x32", type: "image/png" },
        { url: BRAND_PWA_ICON_192_PATH, sizes: "192x192", type: "image/png" },
        { url: BRAND_PWA_ICON_512_PATH, sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: BRAND_APPLE_TOUCH_ICON_PATH,
          sizes: "180x180",
          type: "image/png",
        },
      ],
      shortcut: BRAND_FAVICON_PNG_PATH,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "dark light",
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
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/png" href={BRAND_FAVICON_PNG_PATH} sizes="32x32" />
        <link rel="icon" type="image/png" href={BRAND_FAVICON_32_PATH} sizes="32x32" />
        <link rel="apple-touch-icon" href={BRAND_APPLE_TOUCH_ICON_PATH} sizes="180x180" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <PlatformSettingsProvider settings={platformSettings}>
          <GoogleOAuthProvider>{children}</GoogleOAuthProvider>
        </PlatformSettingsProvider>
      </body>
    </html>
  );
}
