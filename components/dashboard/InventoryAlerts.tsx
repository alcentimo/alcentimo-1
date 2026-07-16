import Link from "next/link";
import { AlertCircle, AlertTriangle, Package } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  getInventoryAlerts,
  getLowStockThreshold,
  isLowStock,
  isOutOfStock,
} from "@/lib/inventory/stock-status";

interface InventoryAlertsProps {
  products: CatalogListItem[];
}

export function InventoryAlerts({ products }: InventoryAlertsProps) {
  const alerts = getInventoryAlerts(products);

  return (
    <section className="card-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Alertas de inventario
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Productos agotados o con stock en el umbral de alerta.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/30">
          <Package className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todo en orden — no hay productos cerca de agotarse.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800">
          {alerts.slice(0, 8).map((product) => {
            const out = isOutOfStock(product);
            const threshold = getLowStockThreshold(product);

            return (
              <li
                key={product.product_id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {product.product_name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {out
                      ? "Sin unidades disponibles"
                      : `Stock bajo · umbral ${threshold}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!out && isLowStock(product) && (
                    <AlertCircle
                      className="h-4 w-4 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      out
                        ? "bg-zinc-900 text-white"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {out ? "Agotado" : `${product.available_stock} uds.`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {alerts.length > 8 && (
        <p className="mt-3 text-xs text-zinc-500">
          Y {alerts.length - 8} producto{alerts.length - 8 !== 1 ? "s" : ""} más…
        </p>
      )}

      <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Link href="/dashboard/catalogo?tab=inventario" className="link-brand text-sm font-medium">
          Ver inventario completo →
        </Link>
      </div>
    </section>
  );
}
