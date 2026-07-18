"use client";

import { useEffect } from "react";
import { registerCatalogServiceWorker } from "@/lib/pwa/register-service-worker";

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    void registerCatalogServiceWorker();
  }, []);

  return null;
}
