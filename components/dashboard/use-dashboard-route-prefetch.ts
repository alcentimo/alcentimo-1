"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { prefetchDashboardRouteData } from "@/lib/dashboard/client-route-cache";
import { resolveDashboardPrefetchRoute } from "@/lib/dashboard/prefetch-routes";

const PREFETCH_DEBOUNCE_MS = 15_000;

export function useDashboardRoutePrefetch() {
  const router = useRouter();
  const lastPrefetchRef = useRef(new Map<string, number>());

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);

      if (!resolveDashboardPrefetchRoute(href)) return;

      const last = lastPrefetchRef.current.get(href) ?? 0;
      if (Date.now() - last < PREFETCH_DEBOUNCE_MS) return;

      lastPrefetchRef.current.set(href, Date.now());

      void prefetchDashboardRouteData(href)?.catch(() => {
        lastPrefetchRef.current.delete(href);
      });
    },
    [router],
  );

  return { prefetchRoute };
}
