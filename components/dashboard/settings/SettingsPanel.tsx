"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreditCard, Link2, Settings2, Tag, Truck } from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { ShippingTab } from "@/components/dashboard/settings/ShippingTab";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { PromotionsTab } from "@/components/dashboard/settings/PromotionsTab";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import type { Coupon } from "@/lib/coupons/types";
import type { GeneralTabStore } from "@/components/dashboard/settings/GeneralTab";

type SettingsTabId = "general" | "shipping" | "payments" | "promotions";

const TABS: {
  id: SettingsTabId;
  label: string;
  icon: typeof Truck;
}[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "shipping", label: "Envío", icon: Truck },
  { id: "payments", label: "Pagos", icon: CreditCard },
  { id: "promotions", label: "Promociones", icon: Tag },
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

  return (
    <div className="settings-workspace">
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones de ajustes"
      >
        {TABS.map((tab) => {
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
        <Link
          href="/dashboard/ajustes/integraciones"
          role="tab"
          aria-selected={integrationsActive}
          className={`settings-tab-link ${integrationsActive ? "settings-tab-link-active" : ""}`}
        >
          <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Integraciones</span>
        </Link>
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
                }
              }
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
        {activeTab === "promotions" && (
          <div
            role="tabpanel"
            id="settings-panel-promotions"
            aria-labelledby="settings-tab-promotions"
          >
            <PromotionsTab initialCoupons={initialCoupons} products={products} />
          </div>
        )}
      </div>
    </div>
  );
}
