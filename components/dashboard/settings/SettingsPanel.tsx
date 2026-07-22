"use client";

import { useEffect, useState } from "react";
import { Clock, Coins, CreditCard, Globe, MapPin, MessageSquare, Palette, Settings2, Tag, Truck } from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { DomainsTab } from "@/components/dashboard/settings/DomainsTab";
import { LocationsTab } from "@/components/dashboard/settings/LocationsTab";
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
import { useLocale } from "@/components/providers/UiPreferencesProvider";
import type { PlanId } from "@/src/config/plans";
import type { StoreLocation } from "@/lib/locations/types";
import type { LocationLimitSummary } from "@/components/dashboard/settings/LocationsTab";

type SettingsTabId =
  | "general"
  | "currency"
  | "location"
  | "shipping"
  | "payments"
  | "promotions"
  | "design"
  | "messages"
  | "domains"
  | "branches";

const VALID_SETTINGS_TABS = new Set<SettingsTabId>([
  "general",
  "currency",
  "location",
  "shipping",
  "payments",
  "promotions",
  "design",
  "messages",
  "domains",
  "branches",
]);

function resolveInitialTab(tab: string | undefined): SettingsTabId {
  if (tab && VALID_SETTINGS_TABS.has(tab as SettingsTabId)) {
    return tab as SettingsTabId;
  }
  return "general";
}

const PRIMARY_TABS: {
  id: SettingsTabId;
  labelKey:
    | "settings.tab.general"
    | "settings.tab.currency"
    | "settings.tab.location"
    | "settings.tab.shipping"
    | "settings.tab.payments";
  icon: typeof Settings2;
}[] = [
  { id: "general", labelKey: "settings.tab.general", icon: Settings2 },
  { id: "currency", labelKey: "settings.tab.currency", icon: Coins },
  { id: "location", labelKey: "settings.tab.location", icon: Clock },
  { id: "shipping", labelKey: "settings.tab.shipping", icon: Truck },
  { id: "payments", labelKey: "settings.tab.payments", icon: CreditCard },
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
  initialTab?: string;
  planId?: PlanId;
  initialLocations?: StoreLocation[];
  locationLimit?: LocationLimitSummary | null;
}

export function SettingsPanel({
  store,
  initialCoupons,
  initialPromotions,
  products,
  initialConfig,
  designPreview = null,
  initialTab = "general",
  planId,
  initialLocations = [],
  locationLimit = null,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    resolveInitialTab(initialTab),
  );
  const promotionsActive = activeTab === "promotions";
  const designActive = activeTab === "design";
  const messagesActive = activeTab === "messages";
  const domainsActive = activeTab === "domains";
  const branchesActive = activeTab === "branches";
  const { t } = useLocale();

  useEffect(() => {
    setActiveTab(resolveInitialTab(initialTab));
  }, [initialTab]);

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
              <span>{t(tab.labelKey)}</span>
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
          onClick={() => setActiveTab("branches")}
          className={`settings-pill-link ${branchesActive ? "settings-pill-link-active" : ""}`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.tab.branches")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("domains")}
          className={`settings-pill-link ${domainsActive ? "settings-pill-link-active" : ""}`}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.tab.domains")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`settings-pill-link ${designActive ? "settings-pill-link-active" : ""}`}
        >
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.tab.design")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("promotions")}
          className={`settings-pill-link ${promotionsActive ? "settings-pill-link-active" : ""}`}
        >
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.tab.promotions")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`settings-pill-link ${messagesActive ? "settings-pill-link-active" : ""}`}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.tab.messages")}
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
                  rubro_tienda: "ropa-moda",
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
        {branchesActive && (
          <div
            role="tabpanel"
            id="settings-panel-branches"
            aria-labelledby="settings-tab-branches"
          >
            <LocationsTab
              initialLocations={initialLocations}
              locationLimit={locationLimit}
            />
          </div>
        )}
        {domainsActive && (
          <div
            role="tabpanel"
            id="settings-panel-domains"
            aria-labelledby="settings-tab-domains"
          >
            <DomainsTab
              store={{
                slug: store?.slug ?? "mi-tienda",
                custom_domain: store?.custom_domain ?? null,
                custom_domain_verified: Boolean(store?.custom_domain_verified),
              }}
              planId={planId}
            />
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
                store?.rubro_tienda ?? "ropa-moda",
              )}
              storeRubro={store?.rubro_tienda ?? "ropa-moda"}
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
