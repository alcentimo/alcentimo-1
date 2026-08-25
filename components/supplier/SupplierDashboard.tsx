"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Package, ShoppingBag, Store, TrendingUp, Wallet } from "lucide-react";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import { SupplierOrdersPanel } from "@/components/supplier/SupplierOrdersPanel";
import { SupplierPaymentsPanel } from "@/components/supplier/SupplierPaymentsPanel";
import { SupplierSalesHistoryPanel } from "@/components/supplier/SupplierSalesHistoryPanel";
import type { SupplierProduct } from "@/lib/supplier/actions";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import type { SupplierPaymentConfig } from "@/lib/supplier/payment-types";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";
import { cn } from "@/lib/cn";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { setMySupplierStoreModeEnabled } from "@/lib/supplier/store-mode-actions";

type SupplierTab = "productos" | "pedidos" | "pagos" | "historial";

interface SupplierDashboardProps {
  initialProducts: SupplierProduct[];
  initialOrders: SupplierOrder[];
  initialPaymentConfig: SupplierPaymentConfig;
  productsError?: string | null;
  ordersError?: string | null;
  paymentConfigError?: string | null;
  payouts?: SupplierPayoutObligationView[];
  creditedBalanceUsd?: number;
  payoutsError?: string | null;
  initialTab?: SupplierTab;
  storeModeEnabled?: boolean;
}

export function SupplierDashboard({
  initialProducts,
  initialOrders,
  initialPaymentConfig,
  productsError = null,
  ordersError = null,
  paymentConfigError = null,
  payouts = [],
  creditedBalanceUsd = 0,
  payoutsError = null,
  initialTab = "productos",
  storeModeEnabled = false,
}: SupplierDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<SupplierTab>(initialTab);
  const [, startTransition] = useTransition();
  const [storeMode, setStoreMode] = useState(storeModeEnabled);
  const [storeModeBusy, setStoreModeBusy] = useState(false);
  const [storeModeError, setStoreModeError] = useState<string | null>(null);

  function selectTab(next: SupplierTab) {
    setTab(next);
    startTransition(() => {
      const href =
        next === "productos"
          ? "/proveedor/dashboard/hub"
          : `/proveedor/dashboard/hub?tab=${next}`;
      router.replace(href, { scroll: false });
    });
  }

  async function handleStoreModeToggle(enabled: boolean) {
    setStoreModeBusy(true);
    setStoreModeError(null);
    setStoreMode(enabled);
    try {
      const result = await setMySupplierStoreModeEnabled({ enabled });
      if (result.error) {
        setStoreMode(!enabled);
        setStoreModeError(result.error);
        return;
      }
      setStoreMode(result.storeModeEnabled === true);
      if (result.storeModeEnabled) {
        router.refresh();
      }
    } catch (err) {
      setStoreMode(!enabled);
      setStoreModeError(
        err instanceof Error ? err.message : "No se pudo guardar el modo tienda.",
      );
    } finally {
      setStoreModeBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="supplier-hub-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Store className="h-4 w-4" aria-hidden="true" />
            Modo Tienda / Dropshipper
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Actívalo para abrir el mismo panel de catálogo, órdenes, clientes y
            analíticas que usa un dropshipper, sin perder tu inventario mayorista.
          </p>
          {storeModeError ? (
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {storeModeError}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SettingsSwitch
            id="supplier-store-mode"
            checked={storeMode}
            disabled={storeModeBusy}
            label="Modo Tienda / Dropshipper"
            onChange={(checked) => void handleStoreModeToggle(checked)}
          />
          {storeMode ? (
            <a
              href="/dashboard/catalogo"
              className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Abrir panel de tienda
            </a>
          ) : null}
        </div>
      </div>

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
        <button
          type="button"
          role="tab"
          aria-selected={tab === "historial"}
          onClick={() => selectTab("historial")}
          className={cn(
            "supplier-hub-tab",
            tab === "historial" && "supplier-hub-tab-active",
          )}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Historial
        </button>
      </div>

      {tab === "productos" ? (
        <div className="space-y-4">
          {productsError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar los productos.
            </p>
          ) : null}
          <SupplierProductsPanel initialProducts={initialProducts} />
        </div>
      ) : null}

      {tab === "pedidos" ? (
        <div className="space-y-4">
          {ordersError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar los pedidos.
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
              No se pudieron cargar los datos de pago.
            </p>
          ) : null}
          {payoutsError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar las liquidaciones.
            </p>
          ) : null}
          <SupplierPaymentsPanel
            initialConfig={initialPaymentConfig}
            payouts={payouts}
            creditedBalanceUsd={creditedBalanceUsd}
          />
        </div>
      ) : null}

      {tab === "historial" ? (
        <div className="space-y-4">
          {ordersError ? (
            <p className="supplier-hub-alert">
              No se pudieron cargar las ventas.
            </p>
          ) : null}
          <SupplierSalesHistoryPanel orders={initialOrders} />
        </div>
      ) : null}
    </div>
  );
}
