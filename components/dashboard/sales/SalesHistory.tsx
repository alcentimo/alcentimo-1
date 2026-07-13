import Image from "next/image";
import { formatUsd } from "@/lib/format";
import type { VentaWithProduct } from "@/lib/sales/types";

interface SalesHistoryProps {
  sales: VentaWithProduct[];
}

function formatSaleDate(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function SalesHistory({ sales }: SalesHistoryProps) {
  if (sales.length === 0) {
    return (
      <div className="card-panel border-dashed text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aún no hay pedidos registrados. Usa el formulario de abajo para crear el primero.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Todos los pedidos
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Historial completo de ventas registradas en tu tienda.
        </p>
      </header>

      <div className="space-y-3">
        {sales.map((sale) => (
          <article
            key={sale.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {sale.thumb_url ? (
                <Image
                  src={sale.thumb_url}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-400 dark:bg-zinc-800">
                  —
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                  {sale.product_name}
                </p>
                <p className="text-xs text-zinc-500">
                  {sale.cantidad} u. · {sale.canal_venta} · {sale.metodo_pago}
                </p>
                <p className="text-xs text-zinc-400">
                  {formatSaleDate(sale.created_at)}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-base font-bold text-teal-700 dark:text-teal-400">
              {formatUsd(sale.monto)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
