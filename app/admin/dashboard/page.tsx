import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardTabs } from "@/components/admin/AdminDashboardTabs";
import {
  resolveAdminDashboardTab,
} from "@/lib/admin/dashboard-nav";
import { getManualPayments } from "@/lib/plans/get-manual-payments";
import { getAdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import { getAdminUsers } from "@/lib/admin/get-admin-users";
import { getGrowthAuditLog } from "@/lib/admin/growth-audit";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { fetchSubscriptionPaymentMethods } from "@/lib/plans/get-subscription-pago-movil";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { DEFAULT_PLAN_SETTINGS } from "@/lib/plans/plan-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/platform-settings";
import { getActiveGlobalExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getDefaultSubscriptionPaymentMethods } from "@/src/config/subscription-pago-movil";
import { listAdminStoreDomains } from "@/lib/admin/custom-domain-actions";
import {
  listSubscriptionCampaigns,
  listSubscriptionCoupons,
} from "@/lib/admin/subscription-promo-actions";
import { getOpenAiApiKey } from "@/lib/env/server";

export const dynamic = "force-dynamic";

function resolveInitialTab(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return resolveAdminDashboardTab(value);
}

function resolveLegacyTabParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? null;
}

function resolvePlanFilter(
  raw: string | string[] | undefined,
): "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "FREE" ||
    value === "PRO" ||
    value === "BUSINESS" ||
    value === "ENTERPRISE"
  ) {
    return value;
  }
  return "all";
}

function resolveMinProducts(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

async function safeLoad<T>(
  loader: () => Promise<T>,
  fallbackMessage: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await loader() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : fallbackMessage,
    };
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    section?: string | string[];
    plan?: string | string[];
    minProducts?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/admin/dashboard");
  }

  if (!isSupportAdmin(resolveAuthEmail(user))) {
    redirect("/dashboard/catalogo?admin_denied=not_listed");
  }

  const params = await searchParams;
  const legacyTabParam = resolveLegacyTabParam(params.tab);
  const initialPlansSubTab = resolveLegacyTabParam(params.section);
  const initialTab = resolveInitialTab(params.tab);
  const growthPlanFilter = resolvePlanFilter(params.plan);
  const growthMinProducts = resolveMinProducts(params.minProducts);

  const [
    paymentsResult,
    messagesResult,
    metricsResult,
    growthResult,
    storeDomainsResult,
    pagoMovilResult,
    planSettingsResult,
    platformSettingsResult,
    automaticBcvRateResult,
  ] = await Promise.all([
    safeLoad(
      () => getManualPayments({ status: "all", limit: 200 }),
      "No se pudieron cargar los pagos manuales.",
    ),
    safeLoad(
      () => getSupportMessages(),
      "No se pudieron cargar los mensajes de soporte.",
    ),
    safeLoad(
      () => getAdminPlanMetrics(),
      "No se pudieron cargar las métricas.",
    ),
    safeLoad(
      () =>
        Promise.all([
          getAdminUsers({ limit: 500 }),
          listSubscriptionCoupons(),
          listSubscriptionCampaigns(),
          getGrowthAuditLog(200),
        ]).then(([users, coupons, campaigns, auditLog]) => ({
          users,
          coupons,
          campaigns,
          auditLog,
        })),
      "No se pudo cargar el módulo de tiendas.",
    ),
    safeLoad(
      () => listAdminStoreDomains(),
      "No se pudieron cargar los dominios personalizados.",
    ),
    safeLoad(
      () => fetchSubscriptionPaymentMethods(),
      "No se pudieron cargar los métodos de pago.",
    ),
    safeLoad(
      () => fetchPlanSettings(),
      "No se pudieron cargar los planes.",
    ),
    safeLoad(
      () => fetchPlatformSettings(),
      "No se pudieron cargar los ajustes de plataforma.",
    ),
    safeLoad(
      () => getActiveGlobalExchangeRate(getSupabaseAnonClient()),
      "No se pudo cargar la tasa BCV de referencia.",
    ),
  ]);

  const payments = paymentsResult.ok ? paymentsResult.data : [];
  const paymentsError = paymentsResult.ok ? null : paymentsResult.error;
  const messages = messagesResult.ok ? messagesResult.data : [];
  const messagesError = messagesResult.ok ? null : messagesResult.error;
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const metricsError = metricsResult.ok ? null : metricsResult.error;
  const growthUsers = growthResult.ok ? growthResult.data.users : [];
  const growthCoupons = growthResult.ok ? growthResult.data.coupons : [];
  const growthCampaigns = growthResult.ok ? growthResult.data.campaigns : [];
  const growthAuditLog = growthResult.ok ? growthResult.data.auditLog : [];
  const growthError = growthResult.ok ? null : growthResult.error;
  const storeDomains = storeDomainsResult.ok ? storeDomainsResult.data : [];
  const storeDomainsError = storeDomainsResult.ok ? null : storeDomainsResult.error;
  const paymentMethods = pagoMovilResult.ok
    ? pagoMovilResult.data
    : getDefaultSubscriptionPaymentMethods();
  const planSettings = planSettingsResult.ok
    ? planSettingsResult.data
    : DEFAULT_PLAN_SETTINGS;
  const platformSettings = platformSettingsResult.ok
    ? platformSettingsResult.data
    : DEFAULT_PLATFORM_SETTINGS;
  const automaticBcvRateHint = automaticBcvRateResult.ok
    ? automaticBcvRateResult.data?.rate ?? null
    : null;

  const pendingPayments = metrics?.pendingPayments ??
    payments.filter(
      (item) =>
        item.status === "pending" || item.status === "needs_correction",
    ).length;
  const pendingMessages = messages.filter((item) => item.status === "pendiente")
    .length;

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-page-header">
        <div>
          <p className="section-label">Administración centralizada</p>
          <h1 className="page-header-title">Panel Admin</h1>
          <p className="page-header-desc">
            Gestión unificada de pagos, tiendas, planes y soporte del SaaS.
          </p>
        </div>
        <div className="admin-dashboard-quick-stats">
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Pagos pendientes</span>
            <strong>{pendingPayments}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Soporte</span>
            <strong>{pendingMessages}</strong>
          </div>
          {metrics ? (
            <>
              <div className="admin-dashboard-quick-stat">
                <span className="admin-dashboard-quick-stat-label">Usuarios</span>
                <strong>{metrics.totalUsers}</strong>
              </div>
              <div className="admin-dashboard-quick-stat">
                <span className="admin-dashboard-quick-stat-label">Tiendas</span>
                <strong>{metrics.totalStores}</strong>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando panel…
          </p>
        }
      >
        <AdminDashboardTabs
          payments={payments}
          messages={messages}
          metrics={metrics}
          paymentMethods={paymentMethods}
          planSettings={planSettings}
          platformSettings={platformSettings}
          automaticBcvRateHint={automaticBcvRateHint}
          growthUsers={growthUsers}
          growthCoupons={growthCoupons}
          growthCampaigns={growthCampaigns}
          growthAuditLog={growthAuditLog}
          growthPlanFilter={growthPlanFilter}
          growthMinProducts={growthMinProducts}
          paymentsError={paymentsError}
          messagesError={messagesError}
          metricsError={metricsError}
          growthError={growthError}
          storeDomains={storeDomains}
          storeDomainsError={storeDomainsError}
          assistantEnabled={Boolean(getOpenAiApiKey())}
          initialTab={initialTab}
          legacyTabParam={legacyTabParam}
          initialPlansSubTab={initialPlansSubTab}
        />
      </Suspense>
    </div>
  );
}
