"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Settings2, Truck } from "lucide-react";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { ShippingTab } from "@/components/dashboard/settings/ShippingTab";
import { SupplierIdentityTab } from "@/components/supplier/SupplierIdentityTab";
import {
  SettingsMobileDetailHeader,
  SettingsMobileNav,
} from "@/components/dashboard/settings/SettingsMobileNav";
import { cn } from "@/lib/cn";
import type { SupplierPublicStorefront } from "@/lib/supplier/storefront-types";
import {
  saveSupplierStorefrontPayments,
  saveSupplierStorefrontShipping,
} from "@/lib/supplier/storefront-actions";

type StorefrontTabId = "general" | "shipping" | "payments";

const VALID_TABS = new Set<StorefrontTabId>([
  "general",
  "shipping",
  "payments",
]);

function resolveTab(tab: string | undefined): StorefrontTabId {
  if (tab && VALID_TABS.has(tab as StorefrontTabId)) {
    return tab as StorefrontTabId;
  }
  return "general";
}

export function SupplierStorefrontSettingsPanel({
  storefront,
  initialTab,
}: {
  storefront: SupplierPublicStorefront;
  initialTab?: string;
}) {
  const router = useRouter();
  const explicitTab = useMemo(
    () => (initialTab && VALID_TABS.has(initialTab as StorefrontTabId)
      ? (initialTab as StorefrontTabId)
      : null),
    [initialTab],
  );
  const [activeTab, setActiveTab] = useState<StorefrontTabId>(() =>
    resolveTab(initialTab),
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(() => !explicitTab);

  const navGroups: {
    label: string;
    items: {
      id: StorefrontTabId;
      label: string;
      description: string;
      icon: typeof Settings2;
    }[];
  }[] = [
    {
      label: "Tienda",
      items: [
        {
          id: "general",
          label: "Identidad",
          description: "Marca, logo y nombre comercial",
          icon: Settings2,
        },
      ],
    },
    {
      label: "Operación",
      items: [
        {
          id: "shipping",
          label: "Envíos",
          description: "Agencias y entrega de tu vitrina",
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
  ];

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
    setMobileMenuOpen(!explicitTab);
  }, [initialTab, explicitTab]);

  function openTab(id: StorefrontTabId) {
    setActiveTab(id);
    setMobileMenuOpen(false);
    router.replace(`/proveedor/dashboard/ajustes?tab=${id}`, { scroll: false });
  }

  function backToMobileMenu() {
    setMobileMenuOpen(true);
    router.replace("/proveedor/dashboard/ajustes", { scroll: false });
  }

  const activeLabel =
    navGroups.flatMap((group) => group.items).find((item) => item.id === activeTab)
      ?.label ?? "Ajustes";

  return (
    <div
      className="settings-workspace"
      data-mobile-view={mobileMenuOpen ? "menu" : "detail"}
    >
      <div className="settings-mobile-master">
        <header className="settings-mobile-master-header">
          <p className="settings-mobile-master-eyebrow">Vitrina pública</p>
          <h1 className="settings-mobile-master-title">
            Configuración de Tienda
          </h1>
          <p className="settings-mobile-master-desc">
            Marca, envíos y pagos de tu catálogo · {storefront.tradeName}
          </p>
        </header>
        <SettingsMobileNav
          groups={navGroups}
          onSelect={(id) => openTab(id as StorefrontTabId)}
          ariaLabel="Menú de configuración de vitrina"
        />
      </div>

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
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openTab(item.id)}
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
          {activeTab === "general" ? (
            <SupplierIdentityTab
              tradeName={storefront.tradeName}
              description={storefront.description}
              logoUrl={storefront.logoUrl}
              publicSlug={storefront.publicCatalogSlug ?? ""}
            />
          ) : null}
          {activeTab === "shipping" ? (
            <ShippingTab
              initialSettings={storefront.shipping}
              persistSettings={saveSupplierStorefrontShipping}
            />
          ) : null}
          {activeTab === "payments" ? (
            <PaymentsTab
              initialSettings={storefront.payments}
              persistSettings={saveSupplierStorefrontPayments}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
