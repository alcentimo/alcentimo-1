"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateOrderEstado } from "@/lib/orders/update-order-estado";
import { OrderEstadoPill } from "@/components/dashboard/orders/OrderEstadoPill";
import {
  ORDER_ESTADO_LABELS,
  ORDER_ESTADOS,
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";

interface OrderStatusSelectProps {
  orderId: string;
  estado: OrderEstado;
  onEstadoUpdated?: (orderId: string, estado: OrderEstado) => void;
  className?: string;
  align?: "start" | "end";
}

export function OrderStatusSelect({
  orderId,
  estado,
  onEstadoUpdated,
  className,
  align = "start",
}: OrderStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [currentEstado, setCurrentEstado] = useState(estado);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentEstado(estado);
  }, [estado]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextEstado: OrderEstado) {
    if (nextEstado === currentEstado || pending) {
      setOpen(false);
      return;
    }

    const previous = currentEstado;
    setError(null);
    setCurrentEstado(nextEstado);
    setOpen(false);

    startTransition(async () => {
      const result = await updateOrderEstado(orderId, nextEstado);

      if (result.error) {
        setError(result.error);
        setCurrentEstado(previous);
        return;
      }

      onEstadoUpdated?.(orderId, nextEstado);
    });
  }

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
        aria-expanded={open}
        aria-label={`Estado del pedido: ${ORDER_ESTADO_LABELS[currentEstado]}. Cambiar estado`}
        onClick={(event) => {
          event.stopPropagation();
          if (!pending) setOpen((value) => !value);
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

      {open ? (
        <div
          role="listbox"
          aria-label="Estados del pedido"
          className={cn(
            "orders-status-menu absolute top-full z-40 mt-1.5 min-w-[12.5rem]",
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
                  "orders-status-menu-item flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                  isSelected && "orders-status-menu-item-active",
                )}
              >
                <OrderEstadoPill estado={option} />
                {isSelected ? (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : null}
              </button>
            );
          })}
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
