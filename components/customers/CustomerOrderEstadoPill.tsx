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
      data-order-estado={displayEstado}
      className={cn(
        "order-estado-pill",
        ORDER_ESTADO_BADGE_CLASS[displayEstado],
        className,
      )}
    >
      <span
        className={cn(
          "order-estado-dot",
          ORDER_ESTADO_DOT_CLASS[displayEstado],
        )}
        aria-hidden="true"
      />
      <span className="truncate">
        {CUSTOMER_ORDER_ESTADO_LABELS[displayEstado]}
      </span>
    </span>
  );
}
