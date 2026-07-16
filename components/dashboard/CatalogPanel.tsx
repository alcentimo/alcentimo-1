"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Settings2 } from "lucide-react";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { SettingsPanel } from "@/components/dashboard/settings/SettingsPanel";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { Coupon } from "@/lib/coupons/types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

type CatalogTabId = "inventario" | "ajustes";

const TABS: { id: CatalogTabId; label: string; icon: typeof Package }[] = [
  { id: "inventario", label: "Inventario", icon: Package },
  { id: "ajustes", label: "Ajustes", icon: Settings2 },
];

interface CatalogPanelProps {
  store: Store;
  exchangeRate: number | null;
  initialProducts: CatalogListItem[];
  productFormConfig: StoreProductFormConfig;
  settingsStore: GeneralTabStore;
  initialCoupons: Coupon[];
  couponProducts: CouponProductOption[];
  initialConfig: StoreSettingsConfig;
}

export function CatalogPanel({
  store,
  exchangeRate,
  initialProducts,
  productFormConfig,
  settingsStore,
  initialCoupons,
  couponProducts,
  initialConfig,
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [autoOpenCreate, setAutoOpenCreate] = useState(
    () => searchParams.get("nuevo") === "1",
  );

  const activeTab: CatalogTabId = tabParam === "ajustes" ? "ajustes" : "inventario";

  function setTab(tab: CatalogTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("nuevo");
    if (tab === "inventario") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
      scroll: false,
    });
  }

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get("tab") === "guia") {
      params.delete("tab");
      changed = true;
    }

    if (params.get("nuevo") === "1") {
      params.delete("nuevo");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  return (
    <div className="settings-workspace">
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones del catálogo"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`catalog-panel-${tab.id}`}
              id={`catalog-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`settings-tab-link ${isActive ? "settings-tab-link-active" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="settings-workspace-body">
        {activeTab === "inventario" && (
          <div
            role="tabpanel"
            id="catalog-panel-inventario"
            aria-labelledby="catalog-tab-inventario"
          >
            <InventoryPanel
              store={store}
              exchangeRate={exchangeRate}
              initialProducts={initialProducts}
              productFormConfig={productFormConfig}
              autoOpenCreate={autoOpenCreate}
              onAutoOpenCreateHandled={() => setAutoOpenCreate(false)}
            />
          </div>
        )}
        {activeTab === "ajustes" && (
          <div
            role="tabpanel"
            id="catalog-panel-ajustes"
            aria-labelledby="catalog-tab-ajustes"
          >
            <SettingsPanel
              store={settingsStore}
              initialCoupons={initialCoupons}
              products={couponProducts}
              initialConfig={initialConfig}
              embedded
            />
          </div>
        )}
      </div>
    </div>
  );
}
