"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ManualPaymentsPanel } from "@/components/admin/ManualPaymentsPanel";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";
import { AdminStoresPanel } from "@/components/admin/AdminStoresPanel";
import { AdminPlansHubPanel } from "@/components/admin/AdminPlansHubPanel";
import { AdminAiAssistantPanel } from "@/components/admin/AdminAiAssistantPanel";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import type { ManualPaymentWithEmail } from "@/lib/plans/get-manual-payments";
import type { AdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import type { GrowthAuditEntry } from "@/lib/admin/growth-audit";
import type {
  SupportMessage,
  SubscriptionCampaign,
  SubscriptionCoupon,
} from "@/lib/database.types";
import type { SubscriptionPaymentMethod } from "@/src/config/subscription-pago-movil";
import type { PlanSettingsMap } from "@/lib/plans/plan-settings";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type { AdminStoreDomainRow } from "@/lib/admin/custom-domain-actions";
import type { DropshipSettlementRecord } from "@/lib/dropship/settlement-types";
import {
  resolveAdminDashboardTab,
  resolveAdminPlansSubTab,
  resolveAdminStoresSubTab,
  type AdminDashboardTab,
} from "@/lib/admin/dashboard-nav";

export type { AdminDashboardTab };

const AdminOverviewPanel = dynamic(
  () =>
    import("@/components/admin/AdminOverviewPanel").then((m) => ({
      default: m.AdminOverviewPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando resumen…</p>
    ),
  },
);

const AdminCouponsPanel = dynamic(
  () =>
    import("@/components/admin/AdminCouponsPanel").then((m) => ({
      default: m.AdminCouponsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando cupones y ofertas…
      </p>
    ),
  },
);

const AdminGrowthPanel = dynamic(
  () =>
    import("@/components/admin/AdminGrowthPanel").then((m) => ({
      default: m.AdminGrowthPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando tiendas y usuarios…
      </p>
    ),
  },
);

const PaymentMethodsConfigPanel = dynamic(
  () =>
    import("@/components/admin/PaymentMethodsConfigPanel").then((m) => ({
      default: m.PaymentMethodsConfigPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando métodos de pago…</p>
    ),
  },
);

const PlatformSettingsConfigPanel = dynamic(
  () =>
    import("@/components/admin/PlatformSettingsConfigPanel").then((m) => ({
      default: m.PlatformSettingsConfigPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando plataforma…</p>
    ),
  },
);

const DropshipShippingConfigPanel = dynamic(
  () =>
    import("@/components/admin/DropshipShippingConfigPanel").then((m) => ({
      default: m.DropshipShippingConfigPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando envíos dropship…
      </p>
    ),
  },
);

const PlanSettingsConfigPanel = dynamic(
  () =>
    import("@/components/admin/PlanSettingsConfigPanel").then((m) => ({
      default: m.PlanSettingsConfigPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando planes…</p>
    ),
  },
);

const AdminCustomDomainsPanel = dynamic(
  () =>
    import("@/components/admin/AdminCustomDomainsPanel").then((m) => ({
      default: m.AdminCustomDomainsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando dominios…</p>
    ),
  },
);

const AdminSupplierCatalogPanel = dynamic(
  () =>
    import("@/components/admin/AdminSupplierCatalogPanel").then((m) => ({
      default: m.AdminSupplierCatalogPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando catálogo mayorista…
      </p>
    ),
  },
);

const AdminStoreLocationsPanel = dynamic(
  () =>
    import("@/components/admin/AdminStoreLocationsPanel").then((m) => ({
      default: m.AdminStoreLocationsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando sucursales…</p>
    ),
  },
);

const DropshipSettlementsPanel = dynamic(
  () =>
    import("@/components/admin/DropshipSettlementsPanel").then((m) => ({
      default: m.DropshipSettlementsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando liquidaciones dropship…
      </p>
    ),
  },
);

interface AdminDashboardTabsProps {
  payments: ManualPaymentWithEmail[];
  messages: SupportMessage[];
  metrics: AdminPlanMetrics | null;
  paymentMethods: SubscriptionPaymentMethod[];
  planSettings: PlanSettingsMap;
  platformSettings: PlatformSettings;
  /** Última tasa BCV sincronizada (sin override manual), solo referencia en admin. */
  automaticBcvRateHint?: number | null;
  growthUsers: AdminUserRow[];
  growthCoupons: SubscriptionCoupon[];
  growthCampaigns: SubscriptionCampaign[];
  growthAuditLog: GrowthAuditEntry[];
  growthPlanFilter?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all";
  growthMinProducts?: number;
  paymentsError?: string | null;
  messagesError?: string | null;
  metricsError?: string | null;
  growthError?: string | null;
  storeDomains?: AdminStoreDomainRow[];
  storeDomainsError?: string | null;
  assistantEnabled?: boolean;
  dropshipSettlements?: DropshipSettlementRecord[];
  dropshipSettlementsError?: string | null;
  pendingSupplierDrafts?: number;
  initialTab?: AdminDashboardTab | string;
  legacyTabParam?: string | null;
  initialPlansSubTab?: string | null;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      {message}
    </p>
  );
}

export function AdminDashboardTabs({
  payments,
  messages,
  metrics,
  paymentMethods,
  planSettings,
  platformSettings,
  automaticBcvRateHint = null,
  growthUsers,
  growthCoupons,
  growthCampaigns,
  growthAuditLog,
  growthPlanFilter = "all",
  growthMinProducts,
  paymentsError = null,
  messagesError = null,
  metricsError = null,
  growthError = null,
  storeDomains = [],
  storeDomainsError = null,
  assistantEnabled = false,
  dropshipSettlements = [],
  dropshipSettlementsError = null,
  pendingSupplierDrafts = 0,
  initialTab = "resumen",
  legacyTabParam = null,
  initialPlansSubTab = null,
}: AdminDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>(() =>
    resolveAdminDashboardTab(
      typeof initialTab === "string" ? initialTab : initialTab,
    ),
  );

  const pendingPayments = useMemo(
    () =>
      payments.filter(
        (item) =>
          item.status === "pending" || item.status === "needs_correction",
      ).length,
    [payments],
  );
  const pendingMessages = useMemo(
    () => messages.filter((item) => item.status === "pendiente").length,
    [messages],
  );

  const pendingSettlements = useMemo(
    () => dropshipSettlements.filter((item) => item.status === "reported").length,
    [dropshipSettlements],
  );

  const badgeCounts = {
    pagos: pendingPayments,
    dropship: pendingSettlements,
    proveedor: pendingSupplierDrafts,
    soporte: pendingMessages,
  };

  function setTab(tab: AdminDashboardTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    params.delete("section");
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  const storesInitialSubTab = resolveAdminStoresSubTab(legacyTabParam);
  const plansInitialSubTab = resolveAdminPlansSubTab(
    initialPlansSubTab ?? legacyTabParam,
  );

  return (
    <AdminDashboardShell
      activeTab={activeTab}
      onTabChange={setTab}
      badgeCounts={badgeCounts}
    >
      {activeTab === "resumen" ? (
        metricsError ? (
          <ErrorBanner message={metricsError} />
        ) : metrics ? (
          <AdminOverviewPanel
            metrics={metrics}
            pendingMessages={pendingMessages}
            pendingDropshipSettlements={pendingSettlements}
            pendingSupplierDrafts={pendingSupplierDrafts}
            assistantEnabled={assistantEnabled}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No hay métricas disponibles.
          </p>
        )
      ) : null}

      {activeTab === "pagos" ? (
        paymentsError ? (
          <ErrorBanner message={paymentsError} />
        ) : (
          <ManualPaymentsPanel initialPayments={payments} />
        )
      ) : null}

      {activeTab === "dropship" ? (
        dropshipSettlementsError ? (
          <ErrorBanner message={dropshipSettlementsError} />
        ) : (
          <DropshipSettlementsPanel initialSettlements={dropshipSettlements} />
        )
      ) : null}

      {activeTab === "proveedor" ? <AdminSupplierCatalogPanel /> : null}

      {activeTab === "tiendas" ? (
        growthError ? (
          <ErrorBanner message={growthError} />
        ) : (
          <AdminStoresPanel
            initialSubTab={storesInitialSubTab}
            usuariosPanel={
              <AdminGrowthPanel
                initialUsers={growthUsers}
                initialCoupons={growthCoupons}
                initialCampaigns={growthCampaigns}
                initialAuditLog={growthAuditLog}
                initialPlanFilter={growthPlanFilter}
                initialMinProducts={growthMinProducts}
                mode="usuarios"
              />
            }
            dominiosPanel={
              storeDomainsError ? (
                <ErrorBanner message={storeDomainsError} />
              ) : (
                <AdminCustomDomainsPanel initialRows={storeDomains} />
              )
            }
            sucursalesPanel={<AdminStoreLocationsPanel />}
          />
        )
      ) : null}

      {activeTab === "cupones" ? (
        growthError ? (
          <ErrorBanner message={growthError} />
        ) : (
          <AdminCouponsPanel
            initialCoupons={growthCoupons}
            initialCampaigns={growthCampaigns}
            initialPlansCouponBoxEnabled={platformSettings.plansCouponBoxEnabled}
          />
        )
      ) : null}

      {activeTab === "planes" ? (
        <AdminPlansHubPanel
          initialSubTab={plansInitialSubTab}
          planesPanel={<PlanSettingsConfigPanel initialSettings={planSettings} />}
          pagosConfigPanel={
            <PaymentMethodsConfigPanel initialMethods={paymentMethods} />
          }
          plataformaPanel={
            <PlatformSettingsConfigPanel
              initialSettings={platformSettings}
              automaticRateHint={automaticBcvRateHint}
            />
          }
          enviosPanel={
            <DropshipShippingConfigPanel initialSettings={platformSettings} />
          }
        />
      ) : null}

      {activeTab === "soporte" ? (
        messagesError ? (
          <ErrorBanner message={messagesError} />
        ) : (
          <SupportMessagesPanel initialMessages={messages} />
        )
      ) : null}

      {activeTab === "ia" ? (
        <AdminAiAssistantPanel
          assistantEnabled={assistantEnabled}
          variant="full"
        />
      ) : null}
    </AdminDashboardShell>
  );
}
