import { ChevronDown } from "lucide-react";
import {
  ORDER_ESTADO_BADGE_CLASS,
  ORDER_ESTADO_DOT_CLASS,
  ORDER_ESTADO_LABELS,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface OrderEstadoPillProps {
  estado: OrderEstado;
  showChevron?: boolean;
  className?: string;
}

export function OrderEstadoPill({
  estado,
  showChevron = false,
  className,
}: OrderEstadoPillProps) {
  return (
    <span
      data-order-estado={estado}
      className={cn(
        "order-estado-pill",
        ORDER_ESTADO_BADGE_CLASS[estado],
        className,
      )}
    >
      <span
        className={cn("order-estado-dot", ORDER_ESTADO_DOT_CLASS[estado])}
        aria-hidden="true"
      />
      <span className="truncate">{ORDER_ESTADO_LABELS[estado]}</span>
      {showChevron ? (
        <ChevronDown
          className="order-estado-pill-chevron h-3 w-3 shrink-0"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
