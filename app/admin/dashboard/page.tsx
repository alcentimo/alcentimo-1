import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardTabs } from "@/components/admin/AdminDashboardTabs";
import { resolveAdminDashboardTab } from "@/lib/admin/dashboard-nav";
import { getAdminUsers } from "@/lib/admin/get-admin-users";
import { getAdminSuppliers } from "@/lib/admin/get-admin-suppliers";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { getOpenAiApiKey } from "@/lib/env/server";
import { listDropshipDailySettlements } from "@/lib/dropship/settlement-admin-actions";
import { countAdminSupplierDraftProducts } from "@/lib/admin/supplier-catalog-actions";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { DEFAULT_PLATFORM_DROPSHIP_SHIPPING } from "@/lib/platform/dropship-shipping";

export const dynamic = "force-dynamic";

function resolveInitialTab(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return resolveAdminDashboardTab(value);
}

function resolveLegacyTabParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? null;
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
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  if (
    tabParam === "tienda" ||
    tabParam === "mi-tienda" ||
    tabParam === "tienda-propia" ||
    tabParam === "mercado-oculto"
  ) {
    redirect("/admin/tienda/catalogo");
  }
  const legacyTabParam = resolveLegacyTabParam(params.tab);
  const initialTab = resolveInitialTab(params.tab);
  const initialStoresSection = resolveLegacyTabParam(params.section);

  const [
    messagesResult,
    dropshippersResult,
    suppliersResult,
    dropshipSettlementsResult,
    supplierDraftsResult,
    platformSettingsResult,
  ] = await Promise.all([
    safeLoad(
      () => getSupportMessages(),
      "No se pudieron cargar los mensajes de soporte.",
    ),
    safeLoad(
      () => getAdminUsers({ limit: 500 }),
      "No se pudo cargar el directorio de dropshippers.",
    ),
    safeLoad(
      () => getAdminSuppliers(),
      "No se pudo cargar el directorio de proveedores.",
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
    safeLoad(
      () => fetchPlatformSettings(),
      "No se pudieron cargar los ajustes de plataforma.",
    ),
  ]);

  const messages = messagesResult.ok ? messagesResult.data : [];
  const messagesError = messagesResult.ok ? null : messagesResult.error;
  const dropshippers = dropshippersResult.ok ? dropshippersResult.data : [];
  const dropshippersError = dropshippersResult.ok ? null : dropshippersResult.error;
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const suppliersError = suppliersResult.ok ? null : suppliersResult.error;
  const dropshipSettlements = dropshipSettlementsResult.ok
    ? dropshipSettlementsResult.data
    : [];
  const dropshipSettlementsError = dropshipSettlementsResult.ok
    ? null
    : dropshipSettlementsResult.error;
  const pendingSupplierDrafts = supplierDraftsResult.ok
    ? supplierDraftsResult.data
    : 0;
  const dropshipShipping = platformSettingsResult.ok
    ? platformSettingsResult.data.dropshipShipping
    : DEFAULT_PLATFORM_DROPSHIP_SHIPPING;

  return (
    <div className="admin-dashboard-page">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando panel…
          </p>
        }
      >
        <AdminDashboardTabs
          messages={messages}
          dropshippers={dropshippers}
          suppliers={suppliers}
          messagesError={messagesError}
          dropshippersError={dropshippersError}
          suppliersError={suppliersError}
          assistantEnabled={Boolean(getOpenAiApiKey())}
          dropshipSettlements={dropshipSettlements}
          dropshipSettlementsError={dropshipSettlementsError}
          pendingSupplierDrafts={pendingSupplierDrafts}
          dropshipShipping={dropshipShipping}
          initialTab={initialTab}
          legacyTabParam={legacyTabParam}
          initialStoresSection={initialStoresSection}
        />
      </Suspense>
    </div>
  );
}
