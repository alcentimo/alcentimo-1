"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Clock, CreditCard, Link2, Palette, Settings2, Tag } from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { DesignTab } from "@/components/dashboard/settings/DesignTab";
import { LocationHoursTab } from "@/components/dashboard/settings/LocationHoursTab";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { PromotionsTab } from "@/components/dashboard/settings/PromotionsTab";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { Coupon } from "@/lib/coupons/types";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";

type SettingsTabId = "general" | "location" | "payments" | "promotions" | "design";

const PRIMARY_TABS: {
  id: SettingsTabId;
  label: string;
  icon: typeof Settings2;
}[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "location", label: "Ubicación y Horario", icon: Clock },
  { id: "payments", label: "Pagos", icon: CreditCard },
];

interface SettingsPanelProps {
  store: GeneralTabStore | null;
  initialCoupons: Coupon[];
  products: CouponProductOption[];
  initialConfig: StoreSettingsConfig;
}

export function SettingsPanel({
  store,
  initialCoupons,
  products,
  initialConfig,
}: SettingsPanelProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const integrationsActive = pathname.startsWith("/dashboard/ajustes/integraciones");
  const promotionsActive = activeTab === "promotions" && !integrationsActive;
  const designActive = activeTab === "design" && !integrationsActive;

  const panel = (
    <>
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones de configuración de tienda"
      >
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !integrationsActive;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab-link ${isActive ? "settings-tab-link-active" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <nav
        className="mt-2 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80"
        aria-label="Más opciones de configuración"
      >
        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            designActive
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200"
          }`}
        >
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          Personalizar diseño
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("promotions")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            promotionsActive
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200"
          }`}
        >
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          Promociones
        </button>
        <Link
          href="/dashboard/ajustes/integraciones"
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            integrationsActive
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Integraciones
        </Link>
      </nav>

      <div className="settings-workspace-body">
        {activeTab === "general" && !integrationsActive && (
          <div
            role="tabpanel"
            id="settings-panel-general"
            aria-labelledby="settings-tab-general"
          >
            <GeneralTab
              store={
                store ?? {
                  name: "",
                  slug: "mi-tienda",
                  logo_url: null,
                  description: null,
                  rubro_tienda: "general",
                }
              }
            />
          </div>
        )}
        {activeTab === "location" && !integrationsActive && (
          <div
            role="tabpanel"
            id="settings-panel-location"
            aria-labelledby="settings-tab-location"
          >
            <LocationHoursTab
              initialLocationHours={initialConfig.locationHours}
              initialShipping={initialConfig.shipping}
              initialContact={initialConfig.contact}
            />
          </div>
        )}
        {activeTab === "payments" && !integrationsActive && (
          <div
            role="tabpanel"
            id="settings-panel-payments"
            aria-labelledby="settings-tab-payments"
          >
            <PaymentsTab initialSettings={initialConfig.payments} />
          </div>
        )}
        {designActive && (
          <div
            role="tabpanel"
            id="settings-panel-design"
            aria-labelledby="settings-tab-design"
          >
            <DesignTab
              initialDesign={resolveCatalogDesign(
                initialConfig.catalogDesign,
                store?.rubro_tienda ?? "general",
              )}
              storeRubro={store?.rubro_tienda ?? "general"}
            />
          </div>
        )}
        {promotionsActive && (
          <div
            role="tabpanel"
            id="settings-panel-promotions"
            aria-labelledby="settings-tab-promotions"
          >
            <PromotionsTab initialCoupons={initialCoupons} products={products} />
          </div>
        )}
      </div>
    </>
  );

  return <div className="settings-workspace">{panel}</div>;
}
