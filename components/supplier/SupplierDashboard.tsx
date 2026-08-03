"use client";

import { useState } from "react";
import { Package, ShoppingBag } from "lucide-react";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import { SupplierOrdersPanel } from "@/components/supplier/SupplierOrdersPanel";
import type { SupplierProduct } from "@/lib/supplier/actions";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import { cn } from "@/lib/cn";

type SupplierTab = "productos" | "pedidos";

interface SupplierDashboardProps {
  initialProducts: SupplierProduct[];
  initialOrders: SupplierOrder[];
  productsError?: string | null;
  ordersError?: string | null;
  initialTab?: SupplierTab;
}

export function SupplierDashboard({
  initialProducts,
  initialOrders,
  productsError = null,
  ordersError = null,
  initialTab = "productos",
}: SupplierDashboardProps) {
  const [tab, setTab] = useState<SupplierTab>(initialTab);

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
        role="tablist"
        aria-label="Secciones del hub"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "productos"}
          onClick={() => setTab("productos")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === "productos"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          )}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          Productos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pedidos"}
          onClick={() => setTab("pedidos")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === "pedidos"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          )}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Pedidos
          {initialOrders.length > 0 ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === "pedidos"
                  ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
              )}
            >
              {initialOrders.length}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "productos" ? (
        <div className="space-y-4">
          {productsError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              No se pudieron cargar los productos ({productsError}).
            </p>
          ) : null}
          <SupplierProductsPanel initialProducts={initialProducts} />
        </div>
      ) : (
        <div className="space-y-4">
          {ordersError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              No se pudieron cargar los pedidos ({ordersError}). Si acabas de
              desplegar, aplica la migración{" "}
              <code className="rounded bg-white/70 px-1">094_supplier_orders</code>
              .
            </p>
          ) : null}
          <SupplierOrdersPanel
            initialOrders={initialOrders}
            products={initialProducts}
          />
        </div>
      )}
    </div>
  );
}
