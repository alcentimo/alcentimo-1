import {
  getOrderCustomerKind,
  getOrderCustomerKindHint,
  getOrderCustomerKindLabel,
} from "@/lib/orders/customer-kind";
import type { CatalogOrder } from "@/lib/orders/types";
import { cn } from "@/lib/cn";

interface OrderCustomerKindBadgeProps {
  order: Pick<CatalogOrder, "customer_user_id">;
  className?: string;
}

export function OrderCustomerKindBadge({
  order,
  className,
}: OrderCustomerKindBadgeProps) {
  const kind = getOrderCustomerKind(order);
  const label = getOrderCustomerKindLabel(kind);
  const hint = getOrderCustomerKindHint(kind);

  return (
    <span
      title={hint}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide",
        kind === "registered"
          ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-700/80",
        className,
      )}
    >
      {label}
    </span>
  );
}
