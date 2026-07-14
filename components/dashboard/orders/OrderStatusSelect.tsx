"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateOrderEstado } from "@/lib/orders/update-order-estado";
import {
  ORDER_ESTADO_BADGE_CLASS,
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
}

export function OrderStatusSelect({
  orderId,
  estado,
  onEstadoUpdated,
  className,
}: OrderStatusSelectProps) {
  const [currentEstado, setCurrentEstado] = useState(estado);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentEstado(estado);
  }, [estado]);

  function handleChange(nextRaw: string) {
    if (!isValidOrderEstado(nextRaw) || nextRaw === currentEstado) return;

    const previous = currentEstado;
    setError(null);
    setCurrentEstado(nextRaw);

    startTransition(async () => {
      const result = await updateOrderEstado(orderId, nextRaw);

      if (result.error) {
        setError(result.error);
        setCurrentEstado(previous);
        return;
      }

      onEstadoUpdated?.(orderId, nextRaw);
    });
  }

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div className="relative inline-flex items-center">
        <select
          value={currentEstado}
          disabled={pending}
          onChange={(event) => handleChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          aria-label="Estado del pedido"
          className={cn(
            "appearance-none rounded-md border py-1 pl-2 pr-7 text-[11px] font-semibold leading-tight outline-none transition-opacity",
            "cursor-pointer focus:ring-2 focus:ring-teal-500/25 disabled:cursor-wait disabled:opacity-70",
            ORDER_ESTADO_BADGE_CLASS[currentEstado],
          )}
        >
          {ORDER_ESTADOS.map((option) => (
            <option key={option} value={option}>
              {ORDER_ESTADO_LABELS[option]}
            </option>
          ))}
        </select>

        {pending && (
          <Loader2
            className="pointer-events-none absolute right-1.5 h-3 w-3 animate-spin opacity-70"
            aria-hidden="true"
          />
        )}
      </div>

      {error && (
        <span className="text-[10px] leading-tight text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
