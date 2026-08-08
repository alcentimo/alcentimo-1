import {
  CUSTOMER_ORDER_ESTADO_LABELS,
  ORDER_ESTADO_BADGE_CLASS,
  ORDER_ESTADO_DOT_CLASS,
  resolveCustomerOrderDisplayEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface CustomerOrderEstadoPillProps {
  estado: OrderEstado;
  /** Si se pasa, el pill puede mostrar Pendiente de pago cuando falta comprobante. */
  paymentProofUrl?: string | null;
  className?: string;
}

export function CustomerOrderEstadoPill({
  estado,
  paymentProofUrl,
  className,
}: CustomerOrderEstadoPillProps) {
  const displayEstado =
    paymentProofUrl === undefined
      ? estado
      : resolveCustomerOrderDisplayEstado({
          estado,
          payment_proof_url: paymentProofUrl,
        });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        ORDER_ESTADO_BADGE_CLASS[displayEstado],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ORDER_ESTADO_DOT_CLASS[displayEstado],
        )}
        aria-hidden="true"
      />
      {CUSTOMER_ORDER_ESTADO_LABELS[displayEstado]}
    </span>
  );
}
