import {
  CUSTOMER_ORDER_ESTADO_LABELS,
  ORDER_ESTADO_BADGE_CLASS,
  ORDER_ESTADO_DOT_CLASS,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface CustomerOrderEstadoPillProps {
  estado: OrderEstado;
  className?: string;
}

export function CustomerOrderEstadoPill({
  estado,
  className,
}: CustomerOrderEstadoPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        ORDER_ESTADO_BADGE_CLASS[estado],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ORDER_ESTADO_DOT_CLASS[estado],
        )}
        aria-hidden="true"
      />
      {CUSTOMER_ORDER_ESTADO_LABELS[estado]}
    </span>
  );
}
