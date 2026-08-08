import {
  CUSTOMER_ORDER_ESTADO_HINTS,
  CUSTOMER_ORDER_ESTADO_LABELS,
  CUSTOMER_ORDER_STATUS_STEPS,
  getCustomerOrderStatusStepIndex,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface CustomerOrderStatusTimelineProps {
  estado: OrderEstado;
  className?: string;
}

export function CustomerOrderStatusTimeline({
  estado,
  className,
}: CustomerOrderStatusTimelineProps) {
  if (estado === "cancelado") {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
          className,
        )}
      >
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {CUSTOMER_ORDER_ESTADO_LABELS.cancelado}
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          {CUSTOMER_ORDER_ESTADO_HINTS.cancelado}
        </p>
      </div>
    );
  }

  const activeIndex = getCustomerOrderStatusStepIndex(estado);

  return (
    <ol className={cn("customer-order-timeline", className)}>
      {CUSTOMER_ORDER_STATUS_STEPS.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li
            key={step}
            className={cn(
              "customer-order-timeline-step",
              done && "is-done",
              current && "is-current",
            )}
          >
            <span className="customer-order-timeline-marker" aria-hidden="true" />
            <div className="customer-order-timeline-copy">
              <p className="customer-order-timeline-title">
                {CUSTOMER_ORDER_ESTADO_LABELS[step]}
              </p>
              {current ? (
                <p className="customer-order-timeline-hint">
                  {CUSTOMER_ORDER_ESTADO_HINTS[step]}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
