"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  META_PIXEL_BOOTSTRAP_SCRIPT,
  META_PIXEL_ID,
  getFbq,
  trackMetaPageView,
} from "@/lib/analytics/meta-pixel";

/**
 * Inyecta el Píxel de Meta de forma global en el cliente.
 * - next/script + afterInteractive (no bloquea SSR/hidratación)
 * - asegura window.fbq antes de trackear
 * - re-dispara PageView en navegaciones del App Router
 */
function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedKey = useRef<string | null>(null);
  const skipFirst = useRef(true);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;

    // El bootstrap ya dispara PageView en la primera carga.
    if (skipFirst.current) {
      skipFirst.current = false;
      lastTrackedKey.current = key;
      return;
    }

    if (lastTrackedKey.current === key) return;
    lastTrackedKey.current = key;

    if (!getFbq()) return;
    trackMetaPageView();
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        // children string es el patrón más fiable en App Router para inline scripts
      >
        {META_PIXEL_BOOTSTRAP_SCRIPT}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
    </>
  );
}
