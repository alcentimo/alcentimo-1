import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";
import { getPublicStoreBySlug } from "@/lib/stores";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";

// HTML dinámico (sesión/carrito). Los productos van al Data Cache (~60s + tags).
export const dynamic = "force-dynamic";

interface CatalogPageProps {
  params: Promise<{ store_slug: string }>;
  searchParams: Promise<{
    checkout?: string;
    carrito?: string;
    product?: string;
  }>;
}

async function CatalogContent({
  storeSlug,
  openCheckoutInitially,
  openCartInitially,
}: {
  storeSlug: string;
  openCheckoutInitially: boolean;
  openCartInitially: boolean;
}) {
  const data = await getPublicCatalogPageData(storeSlug);
  if (!data) notFound();

  const {
    store,
    products,
    exchangeRate,
    purchaseInfo,
    catalogDesign,
    catalogCurrency,
    storeCategories,
    locations,
    locationStocks,
    totalCount,
    featuredBrands,
  } = data;

  return (
    <TransactionalCatalog
      store={store}
      products={products}
      storeCategories={storeCategories}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogDesign={catalogDesign}
      catalogCurrency={catalogCurrency}
      openCheckoutInitially={openCheckoutInitially}
      openCartInitially={openCartInitially}
      locations={locations}
      locationStocks={locationStocks}
      catalogTotalCount={totalCount}
      enableServerPagination
      featuredBrands={featuredBrands}
    />
  );
}

export default async function TransactionalCatalogPage({
  params,
  searchParams,
}: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;
  const query = await searchParams;
  const openCheckoutInitially = query.checkout === "1";
  const openCartInitially = query.carrito === "1";
  const initialProductId = query.product?.trim() || null;
  if (initialProductId) {
    redirect(
      getStoreProductDeepLinkPath(storeSlug, initialProductId, {
        pathname: `/c/${storeSlug}`,
      }),
    );
  }

  return (
    <Suspense
      fallback={
        <div className="txn-catalog-loading">
          <CatalogProductGridSkeleton count={8} />
        </div>
      }
    >
      <CatalogContent
        storeSlug={storeSlug}
        openCheckoutInitially={openCheckoutInitially}
        openCartInitially={openCartInitially}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `${store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${store.name}`,
  };
}
