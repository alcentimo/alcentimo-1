"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Coins,
  CreditCard,
  Globe,
  MapPin,
  MessageSquare,
  Palette,
  Settings2,
  Tag,
  Truck,
} from "lucide-react";
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
import type { PlanId } from "@/src/config/plans";
import type { StoreLocation } from "@/lib/locations/types";
import type { LocationLimitSummary } from "@/components/dashboard/settings/LocationsTab";
import { cn } from "@/lib/cn";

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

type NavItem = {
  id: SettingsTabId;
  label: string;
  icon: typeof Settings2;
};

const SETTINGS_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Tienda",
    items: [
      { id: "general", label: "Identidad", icon: Settings2 },
      { id: "location", label: "Horarios y contacto", icon: Clock },
      { id: "currency", label: "Moneda", icon: Coins },
    ],
  },
  {
    label: "Operación",
    items: [
      { id: "shipping", label: "Envíos", icon: Truck },
      { id: "payments", label: "Pagos", icon: CreditCard },
      { id: "branches", label: "Sucursales", icon: MapPin },
    ],
  },
  {
    label: "Presencia",
    items: [
      { id: "domains", label: "Dominio", icon: Globe },
      { id: "design", label: "Diseño del catálogo", icon: Palette },
    ],
  },
  {
    label: "Clientes",
    items: [
      { id: "promotions", label: "Promociones", icon: Tag },
      { id: "messages", label: "Mensajes", icon: MessageSquare },
    ],
  },
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
  initialDomain?: string | null;
  initialDomainMode?: "connect" | "purchase" | null;
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
  initialDomain = null,
  initialDomainMode = null,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    resolveInitialTab(initialTab),
  );

  useEffect(() => {
    setActiveTab(resolveInitialTab(initialTab));
  }, [initialTab]);

  const storeSlug = store?.slug ?? "mi-tienda";

  function renderActivePanel() {
    switch (activeTab) {
      case "general":
        return (
          <GeneralTab
            store={
              store ?? {
                name: "",
                slug: storeSlug,
                logo_url: null,
                description: null,
                rubro_tienda: "ropa-moda",
              }
            }
          />
        );
      case "currency":
        return (
          <CatalogCurrencyTab initialSettings={initialConfig.catalogCurrency} />
        );
      case "location":
        return (
          <LocationHoursTab
            initialLocationHours={initialConfig.locationHours}
            initialContact={initialConfig.contact}
          />
        );
      case "shipping":
        return <ShippingTab initialSettings={initialConfig.shipping} />;
      case "payments":
        return <PaymentsTab initialSettings={initialConfig.payments} />;
      case "branches":
        return (
          <LocationsTab
            initialLocations={initialLocations}
            locationLimit={locationLimit}
          />
        );
      case "domains":
        return (
          <DomainsTab
            store={{
              slug: storeSlug,
              custom_domain: store?.custom_domain ?? null,
              custom_domain_verified: Boolean(store?.custom_domain_verified),
            }}
            planId={planId}
            initialDomain={initialDomain}
            initialDomainMode={initialDomainMode}
          />
        );
      case "design":
        return (
          <DesignTab
            initialDesign={resolveCatalogDesign(
              initialConfig.catalogDesign,
              store?.rubro_tienda ?? "ropa-moda",
            )}
            storeRubro={store?.rubro_tienda ?? "ropa-moda"}
            preview={designPreview}
          />
        );
      case "promotions":
        return (
          <PromotionsTab
            initialCoupons={initialCoupons}
            initialPromotions={initialPromotions}
            products={products}
          />
        );
      case "messages":
        return (
          <MessageTemplatesTab
            initialSettings={initialConfig.messageTemplates}
            storeName={store?.name}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="settings-workspace">
      <div className="settings-workspace-layout">
        <aside className="settings-sidebar" aria-label="Secciones de configuración">
          <nav className="settings-sidebar-nav">
            {SETTINGS_NAV_GROUPS.map((group) => (
              <div key={group.label} className="settings-sidebar-group">
                <p className="settings-sidebar-group-label">{group.label}</p>
                <ul className="settings-sidebar-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "settings-sidebar-link",
                            isActive && "settings-sidebar-link-active",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div
          className="settings-workspace-body"
          role="region"
          aria-label="Contenido de configuración"
        >
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}
