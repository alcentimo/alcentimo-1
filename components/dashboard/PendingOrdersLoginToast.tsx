"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, X } from "lucide-react";
import { consumePostLoginNotify } from "@/lib/dashboard/post-login-notify";

const TOAST_VISIBLE_MS = 6_500;

/**
 * Toast temporal tras login exitoso cuando hay pedidos pendientes.
 * El badge de Órdenes en el sidebar permanece como indicador permanente.
 */
export function PendingOrdersLoginToast({
  pendingOrdersCount,
  shellReady,
}: {
  pendingOrdersCount: number;
  shellReady: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shellReady) return;

    // Solo evaluar una vez cuando el shell ya trajo el conteo real.
    const shouldNotify = consumePostLoginNotify();
    if (!shouldNotify || pendingOrdersCount <= 0) {
      return;
    }

    setCount(pendingOrdersCount);
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, TOAST_VISIBLE_MS);

    return () => window.clearTimeout(timer);
    // pendingOrdersCount solo se lee en el momento en que shellReady pasa a true.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast post-login one-shot
  }, [shellReady]);

  if (!visible || count <= 0) {
    return null;
  }

  const label =
    count === 1
      ? "Tienes 1 pago por verificar"
      : `Tienes ${count} pagos por verificar`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 sm:bottom-6 sm:justify-end sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-lg shadow-zinc-900/10 backdrop-blur-sm dark:border-amber-900/50 dark:bg-zinc-950/95 dark:shadow-black/40">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {label}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Revisa los comprobantes de tus clientes en Órdenes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <Link
          href="/dashboard/pedidos"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-900 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
          onClick={() => setVisible(false)}
        >
          Ver órdenes
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
