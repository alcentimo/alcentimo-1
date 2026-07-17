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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        ORDER_ESTADO_BADGE_CLASS[estado],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ORDER_ESTADO_DOT_CLASS[estado])}
        aria-hidden="true"
      />
      {ORDER_ESTADO_LABELS[estado]}
      {showChevron ? (
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
      ) : null}
    </span>
  );
}
