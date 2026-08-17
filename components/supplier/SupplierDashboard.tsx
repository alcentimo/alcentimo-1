"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Package, ShoppingBag, Wallet } from "lucide-react";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import { SupplierOrdersPanel } from "@/components/supplier/SupplierOrdersPanel";
import { SupplierPaymentsPanel } from "@/components/supplier/SupplierPaymentsPanel";
import type { SupplierProduct } from "@/lib/supplier/actions";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import type { SupplierPaymentConfig } from "@/lib/supplier/payment-types";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";
import { cn } from "@/lib/cn";

type SupplierTab = "productos" | "pedidos" | "pagos";

interface SupplierDashboardProps {
  initialProducts: SupplierProduct[];
  initialOrders: SupplierOrder[];
  initialPaymentConfig: SupplierPaymentConfig;
  productsError?: string | null;
  ordersError?: string | null;
  paymentConfigError?: string | null;
  payouts?: SupplierPayoutObligationView[];
  payoutsError?: string | null;
  initialTab?: SupplierTab;
}

export function SupplierDashboard({
  initialProducts,
  initialOrders,
  initialPaymentConfig,
  productsError = null,
  ordersError = null,
  paymentConfigError = null,
  payouts = [],
  payoutsError = null,
  initialTab = "productos",
}: SupplierDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<SupplierTab>(initialTab);
  const [, startTransition] = useTransition();

  function selectTab(next: SupplierTab) {
    setTab(next);
    startTransition(() => {
      const href =
        next === "productos"
          ? "/proveedor/dashboard"
          : `/proveedor/dashboard?tab=${next}`;
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
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pagos"}
          onClick={() => selectTab("pagos")}
          className={cn(
            "supplier-hub-tab",
            tab === "pagos" && "supplier-hub-tab-active",
          )}
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Pagos
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
      ) : null}

      {tab === "pedidos" ? (
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
      ) : null}

      {tab === "pagos" ? (
        <div className="space-y-4">
          {paymentConfigError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar los datos de pago ({paymentConfigError}).
              Aplica la migración{" "}
              <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
                112_supplier_b2b_payments
              </code>
              .
            </p>
          ) : null}
          {payoutsError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar las liquidaciones ({payoutsError}). Aplica
              la migración{" "}
              <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
                121_dropship_daily_settlements
              </code>
              .
            </p>
          ) : null}
          <SupplierPaymentsPanel
            initialConfig={initialPaymentConfig}
            payouts={payouts}
          />
        </div>
      ) : null}
    </div>
  );
}
