import { OrderEstadoPill } from "@/components/dashboard/orders/OrderEstadoPill";
import type { OrderEstado } from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface OrderEstadoBadgeProps {
  estado: OrderEstado;
  className?: string;
}

export function OrderEstadoBadge({ estado, className }: OrderEstadoBadgeProps) {
  return <OrderEstadoPill estado={estado} className={className} />;
}
