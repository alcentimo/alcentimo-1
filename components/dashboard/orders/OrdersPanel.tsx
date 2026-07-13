import Link from "next/link";
import { formatUsd } from "@/lib/format";
import type { CatalogOrder } from "@/lib/orders/types";

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function summarizeItems(order: CatalogOrder): string {
  return order.items
    .map((item) => `${item.quantity}x ${item.product_name}`)
    .join(", ");
}

interface OrdersPanelProps {
  orders: CatalogOrder[];
}

export function OrdersPanel({ orders }: OrdersPanelProps) {
  if (orders.length === 0) {
    return (
      <div className="card-panel text-center">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Aún no hay pedidos del catálogo público
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Comparte tu enlace{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
            /c/tu-tienda
          </code>{" "}
          para que los clientes puedan comprar.
        </p>
      </div>
    );
  }

  return (
    <div className="card-panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Productos</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Comprobante</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {orders.map((order) => (
              <tr key={order.id} className="bg-white dark:bg-zinc-950">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {order.customer_name}
                </td>
                <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  <span className="line-clamp-2">{summarizeItems(order)}</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatUsd(order.total_usd)}
                </td>
                <td className="px-4 py-3">
                  {order.payment_proof_url ? (
                    <Link
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Ver comprobante
                    </Link>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatOrderDate(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
