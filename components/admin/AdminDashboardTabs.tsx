"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ManualPaymentsPanel } from "@/components/admin/ManualPaymentsPanel";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import { AdminMetricsPanel } from "@/components/admin/AdminMetricsPanel";
import { PaymentMethodsConfigPanel } from "@/components/admin/PaymentMethodsConfigPanel";
import { PlatformLogoConfigCard } from "@/components/admin/PlatformLogoConfigCard";
import { PlanSettingsConfigPanel } from "@/components/admin/PlanSettingsConfigPanel";
import { PlatformSettingsConfigPanel } from "@/components/admin/PlatformSettingsConfigPanel";
import { AdminGrowthPanel } from "@/components/admin/AdminGrowthPanel";
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
import { AdminCustomDomainsPanel } from "@/components/admin/AdminCustomDomainsPanel";
import type { AdminStoreDomainRow } from "@/lib/admin/custom-domain-actions";
import { cn } from "@/lib/cn";

export type AdminDashboardTab =
  | "pagos"
  | "soporte"
  | "metricas"
  | "configuracion"
  | "plataforma"
  | "planes"
  | "crecimiento"
  | "dominios";

const TABS: Array<{
  id: AdminDashboardTab;
  label: string;
  description: string;
  showBadge?: boolean;
}> = [
  {
    id: "pagos",
    label: "Pagos Pendientes",
    description: "Confirma comprobantes y activa el plan del dueño.",
    showBadge: true,
  },
  {
    id: "soporte",
    label: "Mensajes de Soporte",
    description: "Bandeja de mensajes y sugerencias de usuarios.",
    showBadge: true,
  },
  {
    id: "metricas",
    label: "Métricas",
    description: "Usuarios registrados y distribución por plan.",
  },
  {
    id: "configuracion",
    label: "Configuración",
    description: "Logo global de la plataforma y datos de Pago Móvil para suscripciones.",
  },
  {
    id: "plataforma",
    label: "Plataforma",
    description: "Logo principal, nombre y datos globales de Alcentimo.",
  },
  {
    id: "planes",
    label: "Configuración de Planes",
    description: "Precios mensuales/anuales y límites de productos por plan.",
  },
  {
    id: "dominios",
    label: "Dominios",
    description: "Asigna y verifica dominios personalizados de tiendas.",
  },
  {
    id: "crecimiento",
    label: "Crecimiento",
    description:
      "Usuarios, otorgar Pro, cupones, campañas y envío de promociones.",
  },
];

function resolveTab(value: string | null): AdminDashboardTab {
  if (value === "soporte") return "soporte";
  if (value === "metricas") return "metricas";
  if (value === "configuracion") return "configuracion";
  if (value === "plataforma") return "plataforma";
  if (value === "planes") return "planes";
  if (value === "crecimiento") return "crecimiento";
  if (value === "dominios") return "dominios";
  return "pagos";
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
  growthPlanFilter?: "FREE" | "PRO" | "BUSINESS" | "all";
  growthMinProducts?: number;
  paymentsError?: string | null;
  messagesError?: string | null;
  metricsError?: string | null;
  growthError?: string | null;
  storeDomains?: AdminStoreDomainRow[];
  storeDomainsError?: string | null;
  initialTab?: AdminDashboardTab;
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
  initialTab = "pagos",
}: AdminDashboardTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab") ?? initialTab);

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

  const counts: Partial<Record<AdminDashboardTab, number>> = {
    pagos: pendingPayments,
    soporte: pendingMessages,
  };

  function setTab(tab: AdminDashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const activeMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          const badge = tab.showBadge ? counts[tab.id] ?? 0 : 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              {tab.label}
              {badge > 0 ? (
                <span
                  className={cn(
                    "ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                    active
                      ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {activeMeta.description}
      </p>

      {activeTab === "pagos" ? (
        paymentsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {paymentsError}
          </p>
        ) : (
          <ManualPaymentsPanel initialPayments={payments} />
        )
      ) : null}

      {activeTab === "soporte" ? (
        messagesError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {messagesError}
          </p>
        ) : (
          <SupportMessagesPanel initialMessages={messages} />
        )
      ) : null}

      {activeTab === "metricas" ? (
        metricsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {metricsError}
          </p>
        ) : metrics ? (
          <AdminMetricsPanel metrics={metrics} />
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No hay métricas disponibles.
          </p>
        )
      ) : null}

      {activeTab === "configuracion" ? (
        <div className="space-y-6">
          <PlatformLogoConfigCard initialSettings={platformSettings} />
          <PaymentMethodsConfigPanel initialDetails={pagoMovil} />
        </div>
      ) : null}

      {activeTab === "plataforma" ? (
        <PlatformSettingsConfigPanel initialSettings={platformSettings} />
      ) : null}

      {activeTab === "planes" ? (
        <PlanSettingsConfigPanel initialSettings={planSettings} />
      ) : null}

      {activeTab === "dominios" ? (
        storeDomainsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {storeDomainsError}
          </p>
        ) : (
          <AdminCustomDomainsPanel initialRows={storeDomains} />
        )
      ) : null}

      {activeTab === "crecimiento" ? (
        growthError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {growthError}
          </p>
        ) : (
          <AdminGrowthPanel
            initialUsers={growthUsers}
            initialCoupons={growthCoupons}
            initialCampaigns={growthCampaigns}
            initialAuditLog={growthAuditLog}
            initialPlanFilter={growthPlanFilter}
            initialMinProducts={growthMinProducts}
          />
        )
      ) : null}
    </div>
  );
}
