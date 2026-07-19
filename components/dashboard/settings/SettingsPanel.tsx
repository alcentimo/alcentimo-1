"use client";

import { useState } from "react";
import { Clock, Coins, CreditCard, MessageSquare, Palette, Settings2, Tag, Truck } from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { CatalogCurrencyTab } from "@/components/dashboard/settings/CatalogCurrencyTab";
import { MessageTemplatesTab } from "@/components/dashboard/settings/MessageTemplatesTab";
import { DesignTab } from "@/components/dashboard/settings/DesignTab";
import { LocationHoursTab } from "@/components/dashboard/settings/LocationHoursTab";
import { ShippingTab } from "@/components/dashboard/settings/ShippingTab";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { PromotionsTab } from "@/components/dashboard/settings/PromotionsTab";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { Store } from "@/lib/database.types";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import type { Coupon } from "@/lib/coupons/types";
import type { Promotion } from "@/lib/promotions/types";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";

type SettingsTabId = "general" | "currency" | "location" | "shipping" | "payments" | "promotions" | "design" | "messages";

const PRIMARY_TABS: {
  id: SettingsTabId;
  label: string;
  icon: typeof Settings2;
}[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "currency", label: "Preferencias de Moneda", icon: Coins },
  { id: "location", label: "Ubicación y Horario", icon: Clock },
  { id: "shipping", label: "Envíos y Entregas", icon: Truck },
  { id: "payments", label: "Pagos", icon: CreditCard },
];

interface DesignPreviewContext {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
}

interface SettingsPanelProps {
  store: GeneralTabStore | null;
  initialCoupons: Coupon[];
  initialPromotions: Promotion[];
  products: CouponProductOption[];
  initialConfig: StoreSettingsConfig;
  designPreview?: DesignPreviewContext | null;
}

export function SettingsPanel({
  store,
  initialCoupons,
  initialPromotions,
  products,
  initialConfig,
  designPreview = null,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const promotionsActive = activeTab === "promotions";
  const designActive = activeTab === "design";
  const messagesActive = activeTab === "messages";

  const panel = (
    <>
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones de configuración de tienda"
      >
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

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
        className="settings-secondary-nav"
        aria-label="Más opciones de configuración"
      >
        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`settings-pill-link ${designActive ? "settings-pill-link-active" : ""}`}
        >
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          Personalizar diseño
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("promotions")}
          className={`settings-pill-link ${promotionsActive ? "settings-pill-link-active" : ""}`}
        >
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          Promociones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`settings-pill-link ${messagesActive ? "settings-pill-link-active" : ""}`}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Plantillas de mensajes
        </button>
      </nav>

      <div className="settings-workspace-body">
        {activeTab === "general" && (
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
        {activeTab === "currency" && (
          <div
            role="tabpanel"
            id="settings-panel-currency"
            aria-labelledby="settings-tab-currency"
          >
            <CatalogCurrencyTab initialSettings={initialConfig.catalogCurrency} />
          </div>
        )}
        {activeTab === "location" && (
          <div
            role="tabpanel"
            id="settings-panel-location"
            aria-labelledby="settings-tab-location"
          >
            <LocationHoursTab
              initialLocationHours={initialConfig.locationHours}
              initialContact={initialConfig.contact}
            />
          </div>
        )}
        {activeTab === "shipping" && (
          <div
            role="tabpanel"
            id="settings-panel-shipping"
            aria-labelledby="settings-tab-shipping"
          >
            <ShippingTab initialSettings={initialConfig.shipping} />
          </div>
        )}
        {activeTab === "payments" && (
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
              preview={designPreview}
            />
          </div>
        )}
        {promotionsActive && (
          <div
            role="tabpanel"
            id="settings-panel-promotions"
            aria-labelledby="settings-tab-promotions"
          >
            <PromotionsTab
              initialCoupons={initialCoupons}
              initialPromotions={initialPromotions}
              products={products}
            />
          </div>
        )}
        {messagesActive && (
          <div
            role="tabpanel"
            id="settings-panel-messages"
            aria-labelledby="settings-tab-messages"
          >
            <MessageTemplatesTab
              initialSettings={initialConfig.messageTemplates}
              storeName={store?.name}
            />
          </div>
        )}
      </div>
    </>
  );

  return <div className="settings-workspace">{panel}</div>;
}
