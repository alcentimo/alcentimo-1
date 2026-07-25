"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ManualPaymentsPanel } from "@/components/admin/ManualPaymentsPanel";
import {
  AdminDashboardShell,
  resolveAdminDashboardTab,
  type AdminDashboardTab,
} from "@/components/admin/AdminDashboardShell";
import { AdminStoresPanel, type AdminStoresSubTab } from "@/components/admin/AdminStoresPanel";
import { AdminPlansHubPanel } from "@/components/admin/AdminPlansHubPanel";
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
import type { SubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";
import type { PlanSettingsMap } from "@/lib/plans/plan-settings";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type { AdminStoreDomainRow } from "@/lib/admin/custom-domain-actions";

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

const PlatformLogoConfigCard = dynamic(
  () =>
    import("@/components/admin/PlatformLogoConfigCard").then((m) => ({
      default: m.PlatformLogoConfigCard,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando configuración…</p>
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

function resolveStoresSubTab(
  legacyTab: string | null | undefined,
): AdminStoresSubTab {
  if (legacyTab === "dominios") return "dominios";
  if (legacyTab === "sucursales") return "sucursales";
  return "usuarios";
}

interface AdminDashboardTabsProps {
  payments: ManualPaymentWithEmail[];
  messages: SupportMessage[];
  metrics: AdminPlanMetrics | null;
  pagoMovil: SubscriptionPagoMovilDetails;
  planSettings: PlanSettingsMap;
  platformSettings: PlatformSettings;
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
  initialTab?: AdminDashboardTab | string;
  legacyTabParam?: string | null;
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
  pagoMovil,
  planSettings,
  platformSettings,
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
  initialTab = "resumen",
  legacyTabParam = null,
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

  const badgeCounts = {
    pagos: pendingPayments,
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

  const storesInitialSubTab = resolveStoresSubTab(legacyTabParam);

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
            promocionesPanel={
              <AdminGrowthPanel
                initialUsers={growthUsers}
                initialCoupons={growthCoupons}
                initialCampaigns={growthCampaigns}
                initialAuditLog={growthAuditLog}
                initialSubTab="cupones"
                mode="promociones"
              />
            }
          />
        )
      ) : null}

      {activeTab === "planes" ? (
        <AdminPlansHubPanel
          planesPanel={<PlanSettingsConfigPanel initialSettings={planSettings} />}
          pagosConfigPanel={
            <PaymentMethodsConfigPanel initialDetails={pagoMovil} />
          }
          plataformaPanel={
            <div className="space-y-6">
              <PlatformLogoConfigCard initialSettings={platformSettings} />
              <PlatformSettingsConfigPanel initialSettings={platformSettings} />
            </div>
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
    </AdminDashboardShell>
  );
}
