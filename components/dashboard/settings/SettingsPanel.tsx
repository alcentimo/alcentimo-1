"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Clock,
  Coins,
  CreditCard,
  Globe,
  Lock,
  MapPin,
  Palette,
  FolderTree,
  Settings2,
  Tag,
  Truck,
  Workflow,
} from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { DomainsTab } from "@/components/dashboard/settings/DomainsTab";
import { LocationsTab } from "@/components/dashboard/settings/LocationsTab";
import { CategoriesTab } from "@/components/dashboard/settings/CategoriesTab";
import { CatalogCurrencyTab } from "@/components/dashboard/settings/CatalogCurrencyTab";
import { WholesaleTab } from "@/components/dashboard/settings/WholesaleTab";
import { DropshipPricingTab } from "@/components/dashboard/settings/DropshipPricingTab";
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
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { Store } from "@/lib/database.types";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import type { Coupon } from "@/lib/coupons/types";
import type { Promotion } from "@/lib/promotions/types";
import type { MarketingAiSuggestionRow } from "@/lib/marketing-ai/types";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";
import type { PlanId } from "@/src/config/plans";
import { planIncludesCustomDomain } from "@/src/config/plan-pricing-ui";
import type { StoreLocation } from "@/lib/locations/types";
import type { LocationLimitSummary } from "@/components/dashboard/settings/LocationsTab";
import type { StoreCategoryRow } from "@/lib/categories/types";
import { getProductCategoriesForRubro, normalizeStoreRubro } from "@/src/config/categories";
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

function resolveExplicitTab(
  tab: string | undefined,
  showDropshipping: boolean,
): SettingsTabId | null {
  if (!tab || !VALID_SETTINGS_TABS.has(tab as SettingsTabId)) {
    return null;
  }
  if (tab === "dropship" && !showDropshipping) {
    return null;
  }
  return tab as SettingsTabId;
}

function resolveInitialTab(
  tab: string | undefined,
  showDropshipping: boolean,
): SettingsTabId {
  return resolveExplicitTab(tab, showDropshipping) ?? "general";
}

type NavItem = {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: typeof Settings2;
};

function buildSettingsNavGroups(showDropshipping: boolean): {
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
          id: "categories",
          label: "Categorías",
          description: "Organiza tu catálogo",
          icon: FolderTree,
        },
        {
          id: "location",
          label: "Horarios y contacto",
          description: "WhatsApp, horario y ubicación",
          icon: Clock,
        },
        {
          id: "currency",
          label: "Moneda",
          description: "Precios y moneda del catálogo",
          icon: Coins,
        },
        {
          id: "wholesale",
          label: "Venta al mayor",
          description: "Precios y pedidos mayoristas",
          icon: Boxes,
        },
        ...(showDropshipping
          ? ([
              {
                id: "dropship",
                label: "Dropshipping",
                description: "Margen y precios de proveedor",
                icon: Workflow,
              },
            ] as NavItem[])
          : []),
      ],
    },
    {
      label: "Operación",
      items: [
        {
          id: "shipping",
          label: "Envíos",
          description: "Zonas, costos y retiro",
          icon: Truck,
        },
        {
          id: "payments",
          label: "Pagos",
          description: "Métodos de cobro",
          icon: CreditCard,
        },
        {
          id: "branches",
          label: "Sucursales",
          description: "Locales y stock por sede",
          icon: MapPin,
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
  initialCategories?: StoreCategoryRow[];
  initialDomain?: string | null;
  initialDomainMode?: "connect" | "purchase" | null;
  /** Solo el admin de soporte del sistema ve Dropshipping. */
  showDropshipping?: boolean;
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
  initialLocations = [],
  locationLimit = null,
  initialCategories = [],
  initialDomain = null,
  initialDomainMode = null,
  showDropshipping = false,
}: SettingsPanelProps) {
  const router = useRouter();
  const navGroups = buildSettingsNavGroups(showDropshipping);
  const explicitTab = useMemo(
    () => resolveExplicitTab(initialTab, showDropshipping),
    [initialTab, showDropshipping],
  );
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    resolveInitialTab(initialTab, showDropshipping),
  );
  /** En móvil: menú de lista vs sub-vista. Desktop ignora este estado. */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(() => !explicitTab);
  const domainLocked =
    planId == null || !planIncludesCustomDomain(planId);

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
    const nextExplicit = resolveExplicitTab(initialTab, showDropshipping);
    setActiveTab(resolveInitialTab(initialTab, showDropshipping));
    setMobileMenuOpen(!nextExplicit);
  }, [initialTab, showDropshipping]);

  const storeSlug = store?.slug ?? "mi-tienda";

  function openSettingsTab(id: SettingsTabId) {
    setActiveTab(id);
    setMobileMenuOpen(false);
    router.replace(`/dashboard/ajustes?tab=${id}`, { scroll: false });
  }

  function backToMobileMenu() {
    setMobileMenuOpen(true);
    router.replace("/dashboard/ajustes", { scroll: false });
  }

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
      case "categories":
        return (
          <CategoriesTab
            initialCategories={initialCategories}
            suggestedNames={getProductCategoriesForRubro(
              normalizeStoreRubro(store?.rubro_tienda),
            ).map((category) => category.label)}
          />
        );
      case "currency":
        return (
          <CatalogCurrencyTab initialSettings={initialConfig.catalogCurrency} />
        );
      case "wholesale":
        return (
          <WholesaleTab
            initialEnabled={initialConfig.catalogCurrency.wholesaleEnabled}
          />
        );
      case "dropship":
        if (!showDropshipping) {
          return (
            <p className="text-sm text-zinc-500">
              Dropshipping no está disponible en esta fase.
            </p>
          );
        }
        return (
          <DropshipPricingTab
            initialSettings={initialConfig.dropshipPricing}
            storeProducts={products.map((product) => ({
              id: product.id,
              name: product.name,
            }))}
          />
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
    <div className="settings-workspace">
      <div className={cn("lg:hidden", mobileMenuOpen ? "block" : "hidden")}>
        <SettingsMobileNav
          groups={mobileNavGroups}
          onSelect={(id) => openSettingsTab(id as SettingsTabId)}
          ariaLabel="Menú de configuración de tienda"
        />
      </div>

      <div
        className={cn(
          "settings-workspace-layout",
          mobileMenuOpen ? "hidden lg:grid" : "grid",
        )}
      >
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
          <div className="lg:hidden">
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
