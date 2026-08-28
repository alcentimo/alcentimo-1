import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CatalogCategoriesView } from "@/components/catalog-transactional/CatalogCategoriesView";
import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";

// HTML dinámico (sesión/carrito). Los productos van al Data Cache (~60s + tags).
export const dynamic = "force-dynamic";

interface CatalogCategoriesPageProps {
  params: Promise<{ store_slug: string }>;
  searchParams: Promise<{ categoria?: string; product?: string }>;
}

async function CategoriesContent({
  storeSlug,
  categorySlug,
}: {
  storeSlug: string;
  categorySlug?: string;
}) {
  const data = await getPublicCatalogPageData(storeSlug, {
    categoryFilter: true,
    categorySlug,
  });
  if (!data) notFound();

  const {
    store,
    products,
    storeCategories,
    selectedCategorySlug,
    exchangeRate,
    purchaseInfo,
    catalogDesign,
    catalogCurrency,
    locations,
    locationStocks,
    totalCount,
    featuredBrands,
  } = data;

  return (
    <CatalogCategoriesView
      store={store}
      products={products}
      storeCategories={storeCategories}
      selectedCategorySlug={selectedCategorySlug ?? null}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogDesign={catalogDesign}
      catalogCurrency={catalogCurrency}
      locations={locations}
      locationStocks={locationStocks}
      catalogTotalCount={totalCount}
      enableServerPagination
      featuredBrands={featuredBrands}
    />
  );
}

export default async function CatalogCategoriesPage({
  params,
  searchParams,
}: CatalogCategoriesPageProps) {
  const { store_slug: storeSlug } = await params;
  const { categoria, product } = await searchParams;
  const productKey = product?.trim();
  if (productKey) {
    redirect(
      getStoreProductDeepLinkPath(storeSlug, productKey, {
        pathname: `/c/${storeSlug}/categorias`,
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
      <CategoriesContent storeSlug={storeSlug} categorySlug={categoria} />
    </Suspense>
  );
}
