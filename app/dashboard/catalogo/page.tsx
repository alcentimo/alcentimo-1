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
import { isBcvRateStale } from "@/lib/exchange-rate/rate-freshness";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { InventoryListSkeleton } from "@/components/dashboard/InventoryListSkeleton";
import { BcvRateStripWithSync } from "@/components/dashboard/BcvRateStripWithSync";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
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
            Crea tu tienda para gestionar productos desde un solo lugar.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo">
            <Button className="btn-brand">Configurar mi tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stockFilter = parseCatalogStockFilter(params.stock);
  const searchQuery = sanitizeInventorySearch(params.q ?? "");
  const pageSize = parseInventoryPageSize(params.per);
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = getInventoryPageOffset(requestedPage, pageSize);

  const [inventory, exchangeRateRow, productFormConfig, previewSettings, productLimitContext, criticalStockCount] =
    await Promise.all([
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
    ]);

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
  const exchangeRateStale = isBcvRateStale(exchangeRateUpdatedAt);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {showOnboardingSuccess ? (
        <div className="alert-success" role="status">
          ¡Tu tienda está lista! Publica tu primer producto y comparte tu catálogo.
        </div>
      ) : null}

      <DashboardPageHeader
        title="Catálogo"
        description={`Gestiona lo que vendes: productos, fotos, precios y stock de ${store.name}.`}
        storeSlug={store.slug}
      />

      <BcvRateStripWithSync
        rate={exchangeRate}
        updatedAt={exchangeRateUpdatedAt}
        stale={exchangeRateStale}
      />

      <Suspense fallback={<InventoryListSkeleton rows={5} showReorderColumn={false} />}>
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
        />
      </Suspense>
    </div>
  );
}
