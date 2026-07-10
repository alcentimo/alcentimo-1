"use client";

import { useState } from "react";
import { CreditCard, Settings2, Tag, Truck } from "lucide-react";
import { GeneralTab } from "@/components/dashboard/settings/GeneralTab";
import { ShippingTab } from "@/components/dashboard/settings/ShippingTab";
import { PaymentsTab } from "@/components/dashboard/settings/PaymentsTab";
import { PromotionsTab } from "@/components/dashboard/settings/PromotionsTab";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import type { Coupon } from "@/lib/coupons/types";

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
  initialCoupons: Coupon[];
  products: CouponProductOption[];
  initialConfig: StoreSettingsConfig;
}

export function SettingsPanel({
  initialCoupons,
  products,
  initialConfig,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");

  return (
    <div className="settings-workspace">
      <nav
        className="settings-tab-nav"
        role="tablist"
        aria-label="Secciones de ajustes"
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

      <div className="settings-workspace-body">
        {activeTab === "general" && (
          <div
            role="tabpanel"
            id="settings-panel-general"
            aria-labelledby="settings-tab-general"
          >
            <GeneralTab initialContact={initialConfig.contact} />
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
