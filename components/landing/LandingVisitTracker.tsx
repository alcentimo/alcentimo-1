"use client";

import { useEffect } from "react";

/** Registra una visita única a la landing (una vez por montaje / sesión). */
export function LandingVisitTracker() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "landing" }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Silenciar errores de red / abort.
    });
    return () => controller.abort();
  }, []);

  return null;
}
