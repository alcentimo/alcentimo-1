"use client";

import {
  getPushVapidPublicKeyAction,
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "@/lib/notifications/push-actions";
import {
  PWA_SW_SCOPE,
  PWA_SW_URL,
} from "@/lib/pwa/constants";
import { registerAdminServiceWorkerForInstall } from "@/lib/pwa/register-admin-service-worker";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function ensureAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  registerAdminServiceWorkerForInstall();

  try {
    const existing = await navigator.serviceWorker.getRegistration(PWA_SW_SCOPE);
    if (existing) return existing;
    return await navigator.serviceWorker.register(PWA_SW_URL, {
      scope: PWA_SW_SCOPE,
      updateViaCache: "none",
    });
  } catch {
    return null;
  }
}

export type EnablePushResult =
  | { ok: true }
  | { ok: false; error: string; code?: "unsupported" | "denied" | "missing_vapid" | "sw" | "save" };

/** Solicita permiso y registra la suscripción Web Push del comerciante. */
export async function enableMerchantPushNotifications(): Promise<EnablePushResult> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return {
      ok: false,
      code: "unsupported",
      error: "Este navegador no admite notificaciones push.",
    };
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      code: "unsupported",
      error: "Las notificaciones push requieren HTTPS.",
    };
  }

  const { publicKey } = await getPushVapidPublicKeyAction();
  if (!publicKey) {
    return {
      ok: false,
      code: "missing_vapid",
      error: "Las notificaciones push aún no están configuradas en el servidor.",
    };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      ok: false,
      code: "denied",
      error: "Permiso de notificaciones denegado.",
    };
  }

  const registration = await ensureAdminServiceWorker();
  if (!registration) {
    return {
      ok: false,
      code: "sw",
      error: "No se pudo registrar el servicio de notificaciones.",
    };
  }

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return {
      ok: false,
      code: "save",
      error: "Suscripción inválida del navegador.",
    };
  }

  const saved = await savePushSubscriptionAction({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent: navigator.userAgent,
  });

  if (!saved.ok) {
    return { ok: false, code: "save", error: saved.error };
  }

  return { ok: true };
}

export async function disableMerchantPushNotifications(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: true };
  }

  try {
    const registration =
      await navigator.serviceWorker.getRegistration(PWA_SW_SCOPE);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await deletePushSubscriptionAction(endpoint);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron desactivar las notificaciones.",
    };
  }
}
