import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getCatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import {
  getInventoryPageOffset,
  getStoreInventory,
} from "@/lib/inventory";
import { parseInventoryPageSize } from "@/lib/inventory/constants";
import { getCriticalStockCount } from "@/lib/inventory/get-critical-stock-count";
import { sanitizeInventorySearch } from "@/lib/inventory/search";
import { parseCatalogStockFilter } from "@/lib/inventory/stock-status";
import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { getOnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { createClient } from "@/lib/supabase/server";
import { listPendingInventorySuggestions } from "@/lib/inventory-ai/run-scan";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { InventoryListSkeleton } from "@/components/dashboard/InventoryListSkeleton";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogPublicLinkMenu } from "@/components/dashboard/CatalogPublicLinkMenu";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{
    onboarded?: string;
    tab?: string;
    stock?: string;
    q?: string;
    page?: string;
    per?: string;
  }>;
}) {
  const session = await getDashboardSession();
  const params = await searchParams;

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/catalogo");
  }

  if (params.tab === "ajustes") {
    redirect("/dashboard/ajustes");
  }

  const { store } = session;
  const showOnboardingSuccess = params.onboarded === "1";

  if (!store) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="page-header">
          <p className="section-label">Catálogo</p>
          <h1 className="page-header-title">Tu vitrina</h1>
          <p className="page-header-desc">
            Crea tu tienda para empezar a añadir productos listos para vender.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/onboarding">
            <Button className="btn-brand">Configurar mi tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stockFilter = parseCatalogStockFilter(params.stock);
  const searchQuery = sanitizeInventorySearch(params.q ?? "");
  const pageSize = parseInventoryPageSize(params.per);
  const requestedPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1,
  );
  const offset = getInventoryPageOffset(requestedPage, pageSize);

  let inventory: Awaited<ReturnType<typeof getStoreInventory>>;
  let exchangeRateRow: Awaited<ReturnType<typeof getCurrentExchangeRate>>;
  let productFormConfig: Awaited<ReturnType<typeof getStoreProductFormConfig>>;
  let previewSettings: Awaited<ReturnType<typeof getCatalogPreviewSettings>>;
  let productLimitContext: Awaited<ReturnType<typeof getStoreProductLimitContext>>;
  let criticalStockCount: number;
  let storeSettings: Awaited<ReturnType<typeof getStoreSettingsConfig>>;
  let inventorySuggestions: Awaited<
    ReturnType<typeof listPendingInventorySuggestions>
  >;

  try {
    [
      inventory,
      exchangeRateRow,
      productFormConfig,
      previewSettings,
      productLimitContext,
      criticalStockCount,
      storeSettings,
      inventorySuggestions,
    ] = await Promise.all([
      getStoreInventory(store.slug, {
        limit: pageSize,
        offset,
        stockFilter,
        search: searchQuery,
      }),
      getCurrentExchangeRate(),
      getStoreProductFormConfig(store.id),
      getCatalogPreviewSettings(store),
      getStoreProductLimitContext(store.id),
      getCriticalStockCount(store.slug),
      getStoreSettingsConfig(store.id),
      (async () => {
        try {
          const supabase = await createClient();
          return await listPendingInventorySuggestions(supabase, store.id);
        } catch {
          return [];
        }
      })(),
    ]);
  } catch (error) {
    console.error("[dashboard/catalogo] initial load failed", error);
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          El catálogo tarda en responder
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No pudimos completar la carga inicial. Reintenta; tu sesión sigue
          activa.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard/catalogo" className="btn-primary">
            Reintentar
          </Link>
          <Link href="/dashboard/login" className="btn-brand-outline">
            Volver al acceso
          </Link>
        </div>
      </div>
    );
  }

  let { products, totalCount } = inventory;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const page = Math.min(requestedPage, totalPages);

  if (page !== requestedPage && totalCount > 0) {
    const corrected = await getStoreInventory(store.slug, {
      limit: pageSize,
      offset: getInventoryPageOffset(page, pageSize),
      stockFilter,
      search: searchQuery,
    });
    products = corrected.products;
    totalCount = corrected.totalCount;
  }

  const exchangeRate = exchangeRateRow?.rate ?? null;
  const exchangeRateUpdatedAt = exchangeRateRow?.created_at ?? null;
  const setupStatus = getOnboardingSetupStatus(
    productLimitContext?.currentCount ?? totalCount,
    storeSettings,
    store.slug,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Catálogo"
        description="Añade productos listos para vender o revisa lo que ya está en tu tienda."
        actions={
          <CatalogPublicLinkMenu
            storeSlug={store.slug}
            customDomain={store.custom_domain}
            customDomainVerified={Boolean(store.custom_domain_verified)}
          />
        }
      />

      <Suspense
        fallback={
          <InventoryListSkeleton rows={5} showReorderColumn={false} />
        }
      >
        <CatalogPanel
          store={store}
          exchangeRate={exchangeRate}
          exchangeRateUpdatedAt={exchangeRateUpdatedAt}
          initialProducts={products}
          initialTotalCount={totalCount}
          initialCriticalStockCount={criticalStockCount}
          productFormConfig={productFormConfig}
          previewSettings={previewSettings}
          productLimitContext={productLimitContext}
          initialStockFilter={stockFilter}
          initialSearchQuery={searchQuery}
          initialPage={page}
          initialPageSize={pageSize}
          setupStatus={setupStatus}
          showWelcomeFromUrl={showOnboardingSuccess}
          inventorySuggestions={inventorySuggestions}
        />
      </Suspense>
    </div>
  );
}
