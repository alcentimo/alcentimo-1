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
      <NewSaleForm products={products} exchangeRate={exchangeRate} />
      <SalesHistory sales={sales} />
    </div>
  );
}
