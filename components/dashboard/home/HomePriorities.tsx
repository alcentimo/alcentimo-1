import Link from "next/link";
import { ArrowRight, CircleAlert, PackageX, Receipt } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogOrder } from "@/lib/orders/types";
import { formatUsd } from "@/lib/format";

interface HomePrioritiesProps {
  outOfStockProducts: CatalogListItem[];
  pendingOrders: CatalogOrder[];
}

interface PriorityRow {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: typeof PackageX;
}

export function HomePriorities({
  outOfStockProducts,
  pendingOrders,
}: HomePrioritiesProps) {
  const items: PriorityRow[] = [];

  for (const product of outOfStockProducts.slice(0, 6)) {
    items.push({
      id: `stock-${product.product_id}`,
      title: product.product_name,
      detail: "Producto agotado — repón stock",
      href: `/dashboard/productos/${product.product_id}/editar`,
      icon: PackageX,
    });
  }

  for (const order of pendingOrders.slice(0, 6)) {
    const hasProof = Boolean(order.payment_proof_url);
    items.push({
      id: `order-${order.id}`,
      title: order.customer_name,
      detail: hasProof
        ? `Pedido sin confirmar · ${formatUsd(order.total_usd)} · revisar pago`
        : `Pedido sin confirmar · ${formatUsd(order.total_usd)}`,
      href: "/dashboard/pedidos",
      icon: hasProof ? Receipt : CircleAlert,
    });
  }

  return (
    <section aria-label="Prioridades">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Prioridades
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-neutral-200 bg-white px-4 py-5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
          ¡Todo al día!
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
              >
                <item.icon
                  className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {item.detail}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-neutral-300 dark:text-neutral-600"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
