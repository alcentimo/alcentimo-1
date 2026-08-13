"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateOrderEstado } from "@/lib/orders/update-order-estado";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";
import { OrderEstadoPill } from "@/components/dashboard/orders/OrderEstadoPill";
import {
  ORDER_ESTADO_HINTS,
  ORDER_ESTADO_LABELS,
  ORDER_ESTADOS,
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";

interface OrderStatusSelectProps {
  orderId: string;
  estado: OrderEstado;
  trackingNumber?: string | null;
  onEstadoUpdated?: (
    orderId: string,
    estado: OrderEstado,
    context?: {
      previousEstado: OrderEstado;
      trackingNumber?: string | null;
    },
  ) => void;
  className?: string;
  align?: "start" | "end";
}

export function OrderStatusSelect({
  orderId,
  estado,
  trackingNumber = null,
  onEstadoUpdated,
  className,
  align = "start",
}: OrderStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [currentEstado, setCurrentEstado] = useState(estado);
  const [currentTracking, setCurrentTracking] = useState(trackingNumber ?? "");
  const [guideDraft, setGuideDraft] = useState(trackingNumber ?? "");
  const [awaitingGuide, setAwaitingGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentEstado(estado);
  }, [estado]);

  useEffect(() => {
    setCurrentTracking(trackingNumber ?? "");
    setGuideDraft(trackingNumber ?? "");
  }, [trackingNumber]);

  useEffect(() => {
    if (!open && !awaitingGuide) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setAwaitingGuide(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setAwaitingGuide(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, awaitingGuide]);

  function applyEstado(nextEstado: OrderEstado, nextTracking?: string | null) {
    if (nextEstado === currentEstado && nextTracking === undefined) {
      setOpen(false);
      setAwaitingGuide(false);
      return;
    }

    const previous = currentEstado;
    const previousTracking = currentTracking;
    setError(null);
    setCurrentEstado(nextEstado);
    if (nextTracking !== undefined) {
      setCurrentTracking(nextTracking ?? "");
    }
    setOpen(false);
    setAwaitingGuide(false);

    startTransition(async () => {
      const result = await updateOrderEstado(orderId, nextEstado, {
        trackingNumber:
          nextEstado === "enviado"
            ? (nextTracking ?? null)
            : undefined,
      });

      if (result.error) {
        setError(result.error);
        setCurrentEstado(previous);
        setCurrentTracking(previousTracking);
        return;
      }

      requestDashboardShellRefresh();
      onEstadoUpdated?.(orderId, nextEstado, {
        previousEstado: previous,
        trackingNumber:
          nextEstado === "enviado"
            ? (result.trackingNumber ?? nextTracking ?? null)
            : undefined,
      });
    });
  }

  function handleSelect(nextEstado: OrderEstado) {
    if (pending) return;

    if (nextEstado === "enviado") {
      setGuideDraft(currentTracking);
      setAwaitingGuide(true);
      setOpen(false);
      return;
    }

    applyEstado(nextEstado);
  }

  const menuOpen = open || awaitingGuide;

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex flex-col gap-1", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        aria-label={`Estado del pedido: ${ORDER_ESTADO_LABELS[currentEstado]}. Cambiar estado`}
        onClick={(event) => {
          event.stopPropagation();
          if (pending) return;
          if (awaitingGuide) {
            setAwaitingGuide(false);
            return;
          }
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex min-h-8 items-center rounded-full transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          pending && "cursor-wait opacity-70",
        )}
      >
        <OrderEstadoPill estado={currentEstado} showChevron />
        {pending ? (
          <Loader2
            className="ml-1 h-3 w-3 shrink-0 animate-spin text-zinc-500"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {currentEstado === "enviado" && currentTracking.trim() ? (
        <span className="max-w-[14rem] truncate text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
          Guía: {currentTracking.trim()}
        </span>
      ) : null}

      {open ? (
        <div
          role="listbox"
          aria-label="Estados del pedido"
          className={cn(
            "orders-status-menu absolute top-full z-40 mt-1.5 w-[15.5rem]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {ORDER_ESTADOS.map((option) => {
            const isSelected = option === currentEstado;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isValidOrderEstado(option)) handleSelect(option);
                }}
                className={cn(
                  "orders-status-menu-item flex w-full items-start gap-2 px-2.5 py-2 text-left transition-colors",
                  isSelected && "orders-status-menu-item-active",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <OrderEstadoPill estado={option} />
                    {isSelected ? (
                      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                    {ORDER_ESTADO_HINTS[option]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {awaitingGuide ? (
        <div
          className={cn(
            "orders-status-menu absolute top-full z-40 mt-1.5 w-[16.5rem] space-y-2 p-3",
            align === "end" ? "right-0" : "left-0",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            <Truck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            Marcar como enviado
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Número de guía (opcional)
            </span>
            <input
              type="text"
              value={guideDraft}
              onChange={(event) => setGuideDraft(event.target.value)}
              placeholder="Ej. MRW-123456"
              autoFocus
              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none ring-violet-500/30 placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              onClick={() => applyEstado("enviado", guideDraft.trim() || null)}
            >
              Confirmar envío
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              onClick={() => applyEstado("enviado", null)}
            >
              Sin guía
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <span className="max-w-[14rem] text-[10px] leading-tight text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
