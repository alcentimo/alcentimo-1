import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardTabs } from "@/components/admin/AdminDashboardTabs";
import { resolveAdminDashboardTab } from "@/lib/admin/dashboard-nav";
import { getAdminUsers } from "@/lib/admin/get-admin-users";
import { getAdminSuppliers } from "@/lib/admin/get-admin-suppliers";
import { getGrowthAuditLog } from "@/lib/admin/growth-audit";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { listAdminStoreDomains } from "@/lib/admin/custom-domain-actions";
import { getOpenAiApiKey } from "@/lib/env/server";
import { listDropshipDailySettlements } from "@/lib/dropship/settlement-admin-actions";
import { countAdminSupplierDraftProducts } from "@/lib/admin/supplier-catalog-actions";

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
  const initialTab = resolveInitialTab(params.tab);
  const initialStoresSection = resolveLegacyTabParam(params.section);
  const growthPlanFilter = resolvePlanFilter(params.plan);
  const growthMinProducts = resolveMinProducts(params.minProducts);

  const [
    messagesResult,
    growthResult,
    suppliersResult,
    storeDomainsResult,
    dropshipSettlementsResult,
    supplierDraftsResult,
  ] = await Promise.all([
    safeLoad(
      () => getSupportMessages(),
      "No se pudieron cargar los mensajes de soporte.",
    ),
    safeLoad(
      () =>
        Promise.all([getAdminUsers({ limit: 500 }), getGrowthAuditLog(200)]).then(
          ([users, auditLog]) => ({ users, auditLog }),
        ),
      "No se pudo cargar el directorio de dropshippers.",
    ),
    safeLoad(
      () => getAdminSuppliers(),
      "No se pudo cargar el directorio de proveedores.",
    ),
    safeLoad(
      () => listAdminStoreDomains(),
      "No se pudieron cargar los dominios personalizados.",
    ),
    safeLoad(
      () =>
        listDropshipDailySettlements({ limit: 80 }).then((result) => {
          if (result.error) throw new Error(result.error);
          return result.settlements ?? [];
        }),
      "No se pudieron cargar las liquidaciones dropship.",
    ),
    safeLoad(
      () => countAdminSupplierDraftProducts(),
      "No se pudieron contar los productos mayoristas pendientes.",
    ),
  ]);

  const messages = messagesResult.ok ? messagesResult.data : [];
  const messagesError = messagesResult.ok ? null : messagesResult.error;
  const growthUsers = growthResult.ok ? growthResult.data.users : [];
  const growthAuditLog = growthResult.ok ? growthResult.data.auditLog : [];
  const growthError = growthResult.ok ? null : growthResult.error;
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const suppliersError = suppliersResult.ok ? null : suppliersResult.error;
  const storeDomains = storeDomainsResult.ok ? storeDomainsResult.data : [];
  const storeDomainsError = storeDomainsResult.ok ? null : storeDomainsResult.error;
  const dropshipSettlements = dropshipSettlementsResult.ok
    ? dropshipSettlementsResult.data
    : [];
  const dropshipSettlementsError = dropshipSettlementsResult.ok
    ? null
    : dropshipSettlementsResult.error;
  const pendingSupplierDrafts = supplierDraftsResult.ok
    ? supplierDraftsResult.data
    : 0;

  const pendingMessages = messages.filter((item) => item.status === "pendiente")
    .length;
  const pendingDropshipSettlements = dropshipSettlements.filter(
    (item) => item.status === "reported",
  ).length;
  const totalStores = new Set(
    growthUsers
      .map((row) => row.storeId)
      .filter((storeId): storeId is string => Boolean(storeId)),
  ).size;
  const totalDropshippers = new Set(growthUsers.map((row) => row.id)).size;

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-page-header">
        <div>
          <p className="section-label">Administración centralizada</p>
          <h1 className="page-header-title">Panel Admin</h1>
          <p className="page-header-desc">
            Gestión de mayorista, liquidaciones dropship, comunidad y soporte.
          </p>
        </div>
        <div className="admin-dashboard-quick-stats">
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Soporte</span>
            <strong>{pendingMessages}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Dropship</span>
            <strong>{pendingDropshipSettlements}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Mayorista</span>
            <strong>{pendingSupplierDrafts}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Dropshippers</span>
            <strong>{totalDropshippers}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Proveedores</span>
            <strong>{suppliers.length}</strong>
          </div>
          <div className="admin-dashboard-quick-stat">
            <span className="admin-dashboard-quick-stat-label">Tiendas</span>
            <strong>{totalStores}</strong>
          </div>
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
          messages={messages}
          growthUsers={growthUsers}
          growthAuditLog={growthAuditLog}
          suppliers={suppliers}
          growthPlanFilter={growthPlanFilter}
          growthMinProducts={growthMinProducts}
          messagesError={messagesError}
          growthError={growthError}
          suppliersError={suppliersError}
          storeDomains={storeDomains}
          storeDomainsError={storeDomainsError}
          assistantEnabled={Boolean(getOpenAiApiKey())}
          dropshipSettlements={dropshipSettlements}
          dropshipSettlementsError={dropshipSettlementsError}
          pendingSupplierDrafts={pendingSupplierDrafts}
          initialTab={initialTab}
          legacyTabParam={legacyTabParam}
          initialStoresSection={initialStoresSection}
        />
      </Suspense>
    </div>
  );
}
