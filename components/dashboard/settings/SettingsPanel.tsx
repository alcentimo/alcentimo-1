"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Coins,
  CreditCard,
  Globe,
  Lock,
  Palette,
  Settings2,
  Tag,
  Truck,
} from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { DomainsTab } from "@/components/dashboard/settings/DomainsTab";
import { CatalogCurrencyTab } from "@/components/dashboard/settings/CatalogCurrencyTab";
import { DesignTab } from "@/components/dashboard/settings/DesignTab";
import { LocationHoursTab } from "@/components/dashboard/settings/LocationHoursTab";
import { ShippingTab } from "@/components/dashboard/settings/ShippingTab";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { PromotionsPanel } from "@/components/dashboard/promotions/PromotionsPanel";
import {
  SettingsMobileDetailHeader,
  SettingsMobileNav,
} from "@/components/dashboard/settings/SettingsMobileNav";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { CatalogPreviewSettings } from "@/lib/catalog/catalog-preview-types";
import type { Store } from "@/lib/database.types";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import type { Coupon } from "@/lib/coupons/types";
import type { Promotion } from "@/lib/promotions/types";
import type { MarketingAiSuggestionRow } from "@/lib/marketing-ai/types";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";
import type { PlanId } from "@/src/config/plans";
import { MERCHANT_SUBSCRIPTION_BILLING_ENABLED } from "@/src/config/plans";
import { planIncludesCustomDomain } from "@/src/config/plan-pricing-ui";
import type { StoreLocation } from "@/lib/locations/types";
import type { LocationLimitSummary } from "@/components/dashboard/settings/LocationsTab";
import { cn } from "@/lib/cn";

type SettingsTabId =
  | "general"
  | "categories"
  | "currency"
  | "wholesale"
  | "dropship"
  | "location"
  | "shipping"
  | "payments"
  | "promotions"
  | "design"
  | "domains"
  | "branches";

const VALID_SETTINGS_TABS = new Set<SettingsTabId>([
  "general",
  "categories",
  "currency",
  "wholesale",
  "dropship",
  "location",
  "shipping",
  "payments",
  "promotions",
  "design",
  "domains",
  "branches",
]);

function resolveExplicitTab(tab: string | undefined): SettingsTabId | null {
  if (!tab || !VALID_SETTINGS_TABS.has(tab as SettingsTabId)) {
    return null;
  }
  // Pestañas retiradas del menú dropshipping → destinos útiles.
  if (tab === "categories") return "general";
  if (tab === "wholesale" || tab === "dropship") return "currency";
  if (tab === "branches") return "location";
  return tab as SettingsTabId;
}

function resolveInitialTab(tab: string | undefined): SettingsTabId {
  return resolveExplicitTab(tab) ?? "general";
}

type NavItem = {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: typeof Settings2;
};

function buildSettingsNavGroups(): {
  label: string;
  items: NavItem[];
}[] {
  return [
    {
      label: "Tienda",
      items: [
        {
          id: "general",
          label: "Identidad",
          description: "Nombre, logo y rubro",
          icon: Settings2,
        },
        {
          id: "location",
          label: "Horarios y contacto",
          description: "WhatsApp para pedidos, horario y ciudad",
          icon: Clock,
        },
        {
          id: "currency",
          label: "Moneda y precios",
          description: "Tu ganancia, moneda y precios del catálogo",
          icon: Coins,
        },
      ],
    },
    {
      label: "Operación",
      items: [
        {
          id: "shipping",
          label: "Envíos",
          description: "Entrega local opcional; las agencias las define Alcéntimo",
          icon: Truck,
        },
        {
          id: "payments",
          label: "Pagos",
          description: "Cómo te pagan tus clientes",
          icon: CreditCard,
        },
      ],
    },
    {
      label: "Presencia",
      items: [
        {
          id: "domains",
          label: "Dominio",
          description: "Tu enlace y dominio propio",
          icon: Globe,
        },
        {
          id: "design",
          label: "Diseño del catálogo",
          description: "Colores, banners y estilo",
          icon: Palette,
        },
      ],
    },
    {
      label: "Clientes",
      items: [
        {
          id: "promotions",
          label: "Promociones",
          description: "Cupones y ofertas",
          icon: Tag,
        },
      ],
    },
  ];
}

interface DesignPreviewContext {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
  catalogProducts?: import("@/lib/database.types").CatalogListItem[];
}

interface SettingsPanelProps {
  store: GeneralTabStore | null;
  initialCoupons: Coupon[];
  initialPromotions: Promotion[];
  products: CouponProductOption[];
  initialAiSuggestions?: MarketingAiSuggestionRow[];
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
  initialAiSuggestions = [],
  initialConfig,
  designPreview = null,
  initialTab,
  planId,
  initialLocations: _initialLocations = [],
  locationLimit: _locationLimit = null,
  initialDomain = null,
  initialDomainMode = null,
}: SettingsPanelProps) {
  const router = useRouter();
  const navGroups = buildSettingsNavGroups();
  const explicitTab = useMemo(
    () => resolveExplicitTab(initialTab),
    [initialTab],
  );
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    resolveInitialTab(initialTab),
  );
  /** En móvil: menú de lista vs sub-vista. Desktop ignora este estado. */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(() => !explicitTab);
  const domainLocked =
    MERCHANT_SUBSCRIPTION_BILLING_ENABLED &&
    (planId == null || !planIncludesCustomDomain(planId));

  const mobileNavGroups = navGroups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      ...item,
      proLocked: item.id === "domains" && domainLocked,
    })),
  }));

  const activeLabel =
    navGroups.flatMap((group) => group.items).find((item) => item.id === activeTab)
      ?.label ?? "Ajustes";

  useEffect(() => {
    const nextExplicit = resolveExplicitTab(initialTab);
    setActiveTab(resolveInitialTab(initialTab));
    setMobileMenuOpen(!nextExplicit);
  }, [initialTab]);

  const storeSlug = store?.slug ?? "mi-tienda";

  function openSettingsTab(id: SettingsTabId) {
    setActiveTab(id);
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document
        .querySelector(".dashboard-main")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    }
    router.replace(`/dashboard/ajustes?tab=${id}`, { scroll: false });
  }

  function backToMobileMenu() {
    setMobileMenuOpen(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document
        .querySelector(".dashboard-main")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    }
    router.replace("/dashboard/ajustes", { scroll: false });
  }

  function renderActivePanel() {
    switch (activeTab) {
      case "general":
      case "categories":
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
      case "wholesale":
      case "dropship":
        return (
          <CatalogCurrencyTab
            initialSettings={initialConfig.catalogCurrency}
            initialDropshipPricing={initialConfig.dropshipPricing}
          />
        );
      case "location":
      case "branches":
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
            initialDesign={initialConfig.catalogDesign}
            initialCheckout={initialConfig.checkout}
            storeRubro={store?.rubro_tienda ?? "ropa-moda"}
            preview={designPreview}
            products={products}
            catalogLink={
              store
                ? {
                    slug: store.slug,
                    customDomain: store.custom_domain ?? null,
                    customDomainVerified: Boolean(store.custom_domain_verified),
                  }
                : null
            }
          />
        );
      case "promotions":
        return (
          <PromotionsPanel
            initialCoupons={initialCoupons}
            initialPromotions={initialPromotions}
            products={products}
            initialAiSuggestions={initialAiSuggestions}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div
      className="settings-workspace"
      data-mobile-view={mobileMenuOpen ? "menu" : "detail"}
    >
      {/* Solo móvil: menú maestro (categorías + opciones). */}
      <div className="settings-mobile-master">
        <header className="settings-mobile-master-header">
          <p className="settings-mobile-master-eyebrow">Administración</p>
          <h1 className="settings-mobile-master-title">
            Configuración de Tienda
          </h1>
          <p className="settings-mobile-master-desc">
            {store?.name
              ? `Elige una sección para editar · ${store.name}`
              : "Elige una sección para editar tu tienda"}
          </p>
        </header>
        <SettingsMobileNav
          groups={mobileNavGroups}
          onSelect={(id) => openSettingsTab(id as SettingsTabId)}
          ariaLabel="Menú de configuración de tienda"
        />
      </div>

      {/* Desktop: sidebar + contenido. Móvil: solo sub-vista cuando data-mobile-view=detail. */}
      <div className="settings-workspace-layout">
        <aside
          className="settings-sidebar settings-sidebar--desktop"
          aria-label="Secciones de configuración"
        >
          <nav className="settings-sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.label} className="settings-sidebar-group">
                <p className="settings-sidebar-group-label">{group.label}</p>
                <ul className="settings-sidebar-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const showProLock =
                      item.id === "domains" && domainLocked;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openSettingsTab(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "settings-sidebar-link",
                            isActive && "settings-sidebar-link-active",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 text-left">
                            {item.label}
                          </span>
                          {showProLock ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-zinc-200/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              title="Exclusivo Plan Profesional"
                            >
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Pro
                            </span>
                          ) : null}
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
          <div className="settings-mobile-detail-chrome">
            <SettingsMobileDetailHeader
              title={activeLabel}
              onBack={backToMobileMenu}
            />
          </div>
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}
