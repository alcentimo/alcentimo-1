"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SettingsSection,
} from "@/components/dashboard/settings/SettingsLayout";
import { getMyPushSubscriptionStatusAction } from "@/lib/notifications/push-actions";
import {
  disableMerchantPushNotifications,
  enableMerchantPushNotifications,
} from "@/lib/notifications/subscribe-push-client";

export function PushNotificationsSettingsCard() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator &&
      window.isSecureContext;
    setSupported(ok);
    if (!ok) return;

    void getMyPushSubscriptionStatusAction().then((status) => {
      setVapidConfigured(status.vapidConfigured);
      setEnabled(status.hasSubscription && status.vapidConfigured);
    });
  }, []);

  function handleEnable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await enableMerchantPushNotifications();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(true);
      setMessage("Recibirás alertas de nuevos pedidos en este dispositivo.");
    });
  }

  function handleDisable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disableMerchantPushNotifications();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setMessage("Notificaciones push desactivadas en este dispositivo.");
    });
  }

  return (
    <SettingsSection
      title="Alertas de pedidos"
      description="Recibe un aviso en el navegador o en el icono de la PWA cuando entre un pedido nuevo, aunque el panel esté en segundo plano."
      variant="payments"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Notificaciones push
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {!supported
                ? "Este navegador o contexto no admite push (usa HTTPS o la PWA instalada)."
                : !vapidConfigured
                  ? "Las claves VAPID aún no están configuradas en el servidor."
                  : enabled
                    ? "Activas en este dispositivo."
                    : "Desactivadas en este dispositivo."}
            </p>
          </div>
        </div>

        {supported && vapidConfigured ? (
          enabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={handleDisable}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Desactivar
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleEnable}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Activar alertas
            </Button>
          )
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-3 text-xs text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </SettingsSection>
  );
}
