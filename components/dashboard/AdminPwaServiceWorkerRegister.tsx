"use client";

import { useEffect } from "react";
import {
  registerAdminServiceWorkerForInstall,
  scheduleAdminServiceWorker,
} from "@/lib/pwa/register-admin-service-worker";

export function AdminPwaServiceWorkerRegister() {
  useEffect(() => {
    registerAdminServiceWorkerForInstall();
    scheduleAdminServiceWorker();
  }, []);

  return null;
}
