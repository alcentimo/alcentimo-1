"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/format";
import { enableMerchantPushNotifications } from "@/lib/notifications/subscribe-push-client";
import type { CatalogOrder } from "@/lib/orders/types";

interface OrderNotificationBellProps {
  unreadCount: number;
  recentOrders: CatalogOrder[];
  onClearUnread: () => void;
  pushEnabled: boolean;
  pushSupported: boolean;
  onPushEnabled: () => void;
}

export function OrderNotificationBell({
  unreadCount,
  recentOrders,
  onClearUnread,
  pushEnabled,
  pushSupported,
  onPushEnabled,
}: OrderNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushMessage(null);
    const result = await enableMerchantPushNotifications();
    setPushBusy(false);
    if (!result.ok) {
      setPushMessage(result.error);
      return;
    }
    onPushEnabled();
    setPushMessage("Alertas push activadas en este dispositivo.");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (unreadCount > 0) onClearUnread();
        }}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          open && "bg-zinc-100 dark:bg-zinc-800",
        )}
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} pedidos nuevos`
            : "Notificaciones"
        }
        aria-expanded={open}
      >
        <Bell className="h-4.5 w-4.5 h-[1.125rem] w-[1.125rem]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Pedidos recientes
            </p>
            <Link
              href="/dashboard/pedidos"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
            >
              Ver todos
            </Link>
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <li className="px-3 py-4 text-sm text-zinc-500">
                Aún no hay pedidos nuevos en esta sesión.
              </li>
            ) : (
              recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href="/dashboard/pedidos"
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                  >
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {order.customer_name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatUsd(order.total_usd)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>

          {pushSupported && !pushEnabled ? (
            <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Activa alertas en tu dispositivo aunque el panel esté cerrado.
              </p>
              <button
                type="button"
                disabled={pushBusy}
                onClick={() => void handleEnablePush()}
                className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {pushBusy ? "Activando…" : "Activar notificaciones push"}
              </button>
              {pushMessage ? (
                <p className="mt-1.5 text-[11px] text-zinc-500">{pushMessage}</p>
              ) : null}
            </div>
          ) : null}

          {pushEnabled ? (
            <div className="border-t border-zinc-100 px-3 py-2 text-[11px] text-teal-700 dark:border-zinc-800 dark:text-teal-300">
              Push activo en este dispositivo
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
