import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AdminDashboardTabs,
  type AdminDashboardTab,
} from "@/components/admin/AdminDashboardTabs";
import { getManualPayments } from "@/lib/plans/get-manual-payments";
import { getAdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import type { AdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import { getAdminUsers, type AdminUserRow } from "@/lib/admin/get-admin-users";
import {
  getGrowthAuditLog,
  type GrowthAuditEntry,
} from "@/lib/admin/growth-audit";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { fetchSubscriptionPagoMovilDetails } from "@/lib/plans/get-subscription-pago-movil";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { listAdminStoreDomains } from "@/lib/admin/custom-domain-actions";
import {
  listSubscriptionCampaigns,
  listSubscriptionCoupons,
} from "@/lib/admin/subscription-promo-actions";
import type {
  SupportMessage,
  SubscriptionCampaign,
  SubscriptionCoupon,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

function resolveInitialTab(raw: string | string[] | undefined): AdminDashboardTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "soporte") return "soporte";
  if (value === "metricas") return "metricas";
  if (value === "configuracion") return "configuracion";
  if (value === "planes") return "planes";
  if (value === "crecimiento") return "crecimiento";
  if (value === "dominios") return "dominios";
  return "pagos";
}

function resolvePlanFilter(
  raw: string | string[] | undefined,
): "FREE" | "PRO" | "BUSINESS" | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "FREE" || value === "PRO" || value === "BUSINESS") return value;
  return "all";
}

function resolveMinProducts(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
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
  const initialTab = resolveInitialTab(params.tab);
  const growthPlanFilter = resolvePlanFilter(params.plan);
  const growthMinProducts = resolveMinProducts(params.minProducts);

  let payments: Awaited<ReturnType<typeof getManualPayments>> = [];
  let messages: SupportMessage[] = [];
  let metrics: AdminPlanMetrics | null = null;
  let growthUsers: AdminUserRow[] = [];
  let growthCoupons: SubscriptionCoupon[] = [];
  let growthCampaigns: SubscriptionCampaign[] = [];
  let growthAuditLog: GrowthAuditEntry[] = [];
  let paymentsError: string | null = null;
  let messagesError: string | null = null;
  let metricsError: string | null = null;
  let growthError: string | null = null;
  let storeDomains: Awaited<ReturnType<typeof listAdminStoreDomains>> = [];
  let storeDomainsError: string | null = null;

  try {
    payments = await getManualPayments({ status: "all", limit: 200 });
  } catch (error) {
    paymentsError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los pagos manuales.";
  }

  try {
    messages = await getSupportMessages();
  } catch (error) {
    messagesError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los mensajes de soporte.";
  }

  try {
    metrics = await getAdminPlanMetrics();
  } catch (error) {
    metricsError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las métricas.";
  }

  try {
    const [users, coupons, campaigns, auditLog] = await Promise.all([
      getAdminUsers({ limit: 300 }),
      listSubscriptionCoupons(),
      listSubscriptionCampaigns(),
      getGrowthAuditLog(200),
    ]);
    growthUsers = users;
    growthCoupons = coupons;
    growthCampaigns = campaigns;
    growthAuditLog = auditLog;
  } catch (error) {
    growthError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el módulo de crecimiento.";
  }

  try {
    storeDomains = await listAdminStoreDomains();
  } catch (error) {
    storeDomainsError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los dominios personalizados.";
  }

  const pagoMovil = await fetchSubscriptionPagoMovilDetails();
  const planSettings = await fetchPlanSettings();

  const pendingPayments = payments.filter(
    (item) =>
      item.status === "pending" || item.status === "needs_correction",
  ).length;
  const pendingMessages = messages.filter((item) => item.status === "pendiente")
    .length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-7 sm:py-10">
      <header className="mb-8 space-y-2">
        <p className="section-label">Administración</p>
        <h1 className="page-header-title">Panel Admin</h1>
        <p className="page-header-desc">
          Pagos, soporte, métricas, configuración y herramientas de
          crecimiento. Exclusivo para administradores.
        </p>
        <div className="flex flex-wrap gap-4 pt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Pagos pendientes:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {pendingPayments}
            </strong>
          </span>
          <span>
            Mensajes pendientes:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {pendingMessages}
            </strong>
          </span>
          {metrics ? (
            <span>
              Usuarios:{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {metrics.totalUsers}
              </strong>
            </span>
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
          pagoMovil={pagoMovil}
          planSettings={planSettings}
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
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
