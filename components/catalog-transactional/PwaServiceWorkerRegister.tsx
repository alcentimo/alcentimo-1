"use client";

import { useEffect } from "react";
import { scheduleCatalogServiceWorker } from "@/lib/pwa/register-service-worker";

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    scheduleCatalogServiceWorker();
  }, []);

  return null;
}
