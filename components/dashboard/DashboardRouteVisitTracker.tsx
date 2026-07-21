"use client";

import { useEffect } from "react";
import { rememberDashboardRouteVisit } from "@/lib/dashboard/client-route-cache";

/** Marca la ruta actual como visitada en la caché local del dashboard. */
export function DashboardRouteVisitTracker({ pathname }: { pathname: string }) {
  useEffect(() => {
    rememberDashboardRouteVisit(pathname);
  }, [pathname]);

  return null;
}
