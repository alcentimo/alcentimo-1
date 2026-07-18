"use client";

import { useEffect } from "react";
import {
  registerCatalogServiceWorkerForInstall,
  scheduleCatalogServiceWorker,
} from "@/lib/pwa/register-service-worker";
import { initBeforeInstallPromptCapture } from "@/lib/pwa/before-install-prompt";

interface PwaServiceWorkerRegisterProps {
  storeSlug: string;
}

export function PwaServiceWorkerRegister({ storeSlug }: PwaServiceWorkerRegisterProps) {
  useEffect(() => {
    initBeforeInstallPromptCapture();
    registerCatalogServiceWorkerForInstall(storeSlug);
    scheduleCatalogServiceWorker(storeSlug);
  }, [storeSlug]);

  return null;
}
