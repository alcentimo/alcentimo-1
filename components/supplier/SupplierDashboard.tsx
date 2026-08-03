"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const router = useRouter();
  const [tab, setTab] = useState<SupplierTab>(initialTab);
  const [, startTransition] = useTransition();

  function selectTab(next: SupplierTab) {
    setTab(next);
    startTransition(() => {
      const href =
        next === "pedidos"
          ? "/proveedor/dashboard?tab=pedidos"
          : "/proveedor/dashboard";
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div className="space-y-5">
      <div
        className="supplier-hub-tabs"
        role="tablist"
        aria-label="Secciones del hub"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "productos"}
          onClick={() => selectTab("productos")}
          className={cn(
            "supplier-hub-tab",
            tab === "productos" && "supplier-hub-tab-active",
          )}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          Productos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pedidos"}
          onClick={() => selectTab("pedidos")}
          className={cn(
            "supplier-hub-tab",
            tab === "pedidos" && "supplier-hub-tab-active",
          )}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Pedidos
          {initialOrders.length > 0 ? (
            <span className="supplier-hub-tab-badge">{initialOrders.length}</span>
          ) : null}
        </button>
      </div>

      {tab === "productos" ? (
        <div className="space-y-4">
          {productsError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar los productos ({productsError}).
            </p>
          ) : null}
          <SupplierProductsPanel initialProducts={initialProducts} />
        </div>
      ) : (
        <div className="space-y-4">
          {ordersError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar los pedidos ({ordersError}). Si acabas de
              desplegar, aplica la migración{" "}
              <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
                094_supplier_orders
              </code>
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
