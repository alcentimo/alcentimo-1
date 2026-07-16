"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Package, Settings2 } from "lucide-react";
import { CatalogGuideTab } from "@/components/dashboard/CatalogGuideTab";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { SettingsPanel } from "@/components/dashboard/settings/SettingsPanel";
import { getPublicSiteHost } from "@/lib/site-url";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { Coupon } from "@/lib/coupons/types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";

type CatalogTabId = "guia" | "inventario" | "ajustes";

interface CatalogPanelProps {
  store: Store;
  exchangeRate: number | null;
  initialProducts: CatalogListItem[];
  productFormConfig: StoreProductFormConfig;
  settingsStore: GeneralTabStore;
  initialCoupons: Coupon[];
  couponProducts: CouponProductOption[];
  initialConfig: StoreSettingsConfig;
  autoOpenCreate?: boolean;
  initialTab?: CatalogTabId;
}

function buildTabs(showGuide: boolean): {
  id: CatalogTabId;
  label: string;
  icon: typeof Package;
}[] {
  const tabs: { id: CatalogTabId; label: string; icon: typeof Package }[] = [];
  if (showGuide) {
    tabs.push({ id: "guia", label: "Guía", icon: Compass });
  }
  tabs.push(
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "ajustes", label: "Ajustes", icon: Settings2 },
  );
  return tabs;
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
  autoOpenCreate,
  initialTab = "inventario",
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [productCount, setProductCount] = useState(initialProducts.length);
  const showGuide = productCount === 0;

  const catalogUrl = useMemo(
    () => `https://${getPublicSiteHost()}/c/${store.slug}`,
    [store.slug],
  );

  const activeTab: CatalogTabId = useMemo(() => {
    if (tabParam === "ajustes") return "ajustes";
    if (tabParam === "inventario") return "inventario";
    if (showGuide) {
      if (tabParam === "guia" || !tabParam) return "guia";
    }
    if (initialTab === "ajustes") return "ajustes";
    return "inventario";
  }, [tabParam, showGuide, initialTab]);

  const tabs = buildTabs(showGuide);

  function setTab(tab: CatalogTabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "inventario" || (tab === "guia" && !showGuide)) {
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
    if (!showGuide && tabParam === "guia") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const query = params.toString();
      router.replace(query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo", {
        scroll: false,
      });
    }
  }, [showGuide, tabParam, searchParams, router]);

  return (
    <div className="settings-workspace">
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones del catálogo"
      >
        {tabs.map((tab) => {
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
        {showGuide && activeTab === "guia" && (
          <div
            role="tabpanel"
            id="catalog-panel-guia"
            aria-labelledby="catalog-tab-guia"
          >
            <CatalogGuideTab
              onGoToAjustes={() => setTab("ajustes")}
              onGoToInventario={() => setTab("inventario")}
              catalogUrl={catalogUrl}
            />
          </div>
        )}
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
              onProductCountChange={setProductCount}
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
