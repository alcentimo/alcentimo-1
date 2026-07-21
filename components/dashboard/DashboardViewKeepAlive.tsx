"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DASHBOARD_VIEW_CACHE_TTL_MS } from "@/lib/dashboard/client-route-cache";

const MAX_VIEW_ENTRIES = 8;

interface ViewCacheEntry {
  view: ReactNode;
  updatedAt: number;
}

interface DashboardViewKeepAliveProps {
  pathname: string;
  children: ReactNode;
}

function pruneViewCache(cache: Map<string, ViewCacheEntry>) {
  if (cache.size <= MAX_VIEW_ENTRIES) return;

  const oldest = [...cache.entries()].sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt,
  )[0];

  if (oldest) {
    cache.delete(oldest[0]);
  }
}

/**
 * Conserva vistas recientes del dashboard en memoria para que volver a una
 * pestaña visitada se sienta instantáneo mientras el servidor revalida.
 */
export function DashboardViewKeepAlive({
  pathname,
  children,
}: DashboardViewKeepAliveProps) {
  const cacheRef = useRef(new Map<string, ViewCacheEntry>());
  const previousPathRef = useRef(pathname);
  const previousChildrenRef = useRef(children);
  const [rendered, setRendered] = useState<ReactNode>(children);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (previousPath !== pathname) {
      cacheRef.current.set(previousPath, {
        view: previousChildrenRef.current,
        updatedAt: Date.now(),
      });
      pruneViewCache(cacheRef.current);

      const cached = cacheRef.current.get(pathname);
      if (cached && Date.now() - cached.updatedAt < DASHBOARD_VIEW_CACHE_TTL_MS) {
        setRendered(cached.view);
      } else {
        setRendered(children);
      }

      previousPathRef.current = pathname;
    } else {
      setRendered(children);
    }

    previousChildrenRef.current = children;
  }, [pathname, children]);

  return <>{rendered}</>;
}
