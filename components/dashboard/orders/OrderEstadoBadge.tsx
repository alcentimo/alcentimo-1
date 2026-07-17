import {
  ORDER_ESTADO_BADGE_CLASS,
  ORDER_ESTADO_LABELS,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface OrderEstadoBadgeProps {
  estado: OrderEstado;
  className?: string;
}

export function OrderEstadoBadge({ estado, className }: OrderEstadoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        ORDER_ESTADO_BADGE_CLASS[estado],
        className,
      )}
    >
      {ORDER_ESTADO_LABELS[estado]}
    </span>
  );
}
