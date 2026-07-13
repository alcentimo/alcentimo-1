"use client";

import type { CatalogListItem } from "@/lib/database.types";
import type { VentaWithProduct } from "@/lib/sales/types";
import { NewSaleForm } from "@/components/dashboard/sales/NewSaleForm";
import { SalesHistory } from "@/components/dashboard/sales/SalesHistory";

interface SalesPanelProps {
  products: CatalogListItem[];
  sales: VentaWithProduct[];
  exchangeRate: number | null;
}

export function SalesPanel({
  products,
  sales,
  exchangeRate,
}: SalesPanelProps) {
  return (
    <div className="space-y-8">
      <SalesHistory sales={sales} />

      <section className="card-panel">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Registrar nueva venta
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Añade un pedido manualmente. El historial completo queda arriba.
          </p>
        </header>
        <NewSaleForm products={products} exchangeRate={exchangeRate} />
      </section>
    </div>
  );
}
