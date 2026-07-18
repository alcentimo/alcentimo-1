"use client";

import { useEffect } from "react";

/** App Router no usa el entry `main.js` de next-pwa; registramos el SW explícitamente. */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // El catálogo funciona sin SW; offline es mejora progresiva.
    });
  }, []);

  return null;
}
