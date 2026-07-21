"use client";

import {
  resolveDashboardPrefetchRoute,
  type DashboardPrefetchRoute,
} from "@/lib/dashboard/prefetch-routes";

/** Tiempo que los datos precargados se consideran frescos en memoria local. */
export const DASHBOARD_ROUTE_CACHE_TTL_MS = 3 * 60 * 1000;

/** Tiempo que una vista visitada permanece en memoria para navegación instantánea. */
export const DASHBOARD_VIEW_CACHE_TTL_MS = 2 * 60 * 1000;

interface RouteCacheEntry {
  fetchedAt: number;
  payload: unknown;
}

const routeDataCache = new Map<DashboardPrefetchRoute, RouteCacheEntry>();
const inflightPrefetches = new Map<DashboardPrefetchRoute, Promise<unknown>>();

function isFresh(fetchedAt: number, ttlMs: number): boolean {
  return Date.now() - fetchedAt < ttlMs;
}

export function getCachedDashboardRouteData(
  route: DashboardPrefetchRoute,
): unknown | null {
  const entry = routeDataCache.get(route);
  if (!entry) return null;
  if (!isFresh(entry.fetchedAt, DASHBOARD_ROUTE_CACHE_TTL_MS)) {
    routeDataCache.delete(route);
    return null;
  }
  return entry.payload;
}

export function setCachedDashboardRouteData(
  route: DashboardPrefetchRoute,
  payload: unknown,
): void {
  routeDataCache.set(route, { fetchedAt: Date.now(), payload });
}

export function prefetchDashboardRouteData(
  href: string,
): Promise<unknown> | null {
  const route = resolveDashboardPrefetchRoute(href);
  if (!route) return null;

  const cached = getCachedDashboardRouteData(route);
  if (cached) return Promise.resolve(cached);

  const pending = inflightPrefetches.get(route);
  if (pending) return pending;

  const promise = fetch(
    `/api/dashboard/prefetch?route=${encodeURIComponent(route)}`,
    { credentials: "same-origin", priority: "low" } as RequestInit,
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Prefetch ${route} failed (${response.status})`);
      }
      return response.json();
    })
    .then((payload) => {
      setCachedDashboardRouteData(route, payload);
      inflightPrefetches.delete(route);
      return payload;
    })
    .catch((error) => {
      inflightPrefetches.delete(route);
      throw error;
    });

  inflightPrefetches.set(route, promise);
  return promise;
}

/** Registra datos ya renderizados por el servidor para reutilizarlos al volver. */
export function rememberDashboardRouteVisit(href: string): void {
  const route = resolveDashboardPrefetchRoute(href);
  if (!route || getCachedDashboardRouteData(route)) return;

  setCachedDashboardRouteData(route, {
    route,
    visitedAt: Date.now(),
    source: "render",
  });
}
