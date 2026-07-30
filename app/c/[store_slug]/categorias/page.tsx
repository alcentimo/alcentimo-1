import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogCategoriesView } from "@/components/catalog-transactional/CatalogCategoriesView";
import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CatalogCategoriesPageProps {
  params: Promise<{ store_slug: string }>;
  searchParams: Promise<{ categoria?: string; product?: string }>;
}

async function CategoriesContent({
  storeSlug,
  categorySlug,
  initialProductId,
}: {
  storeSlug: string;
  categorySlug?: string;
  initialProductId?: string | null;
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
      initialProductId={initialProductId}
    />
  );
}

export default async function CatalogCategoriesPage({
  params,
  searchParams,
}: CatalogCategoriesPageProps) {
  const { store_slug: storeSlug } = await params;
  const { categoria, product } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="txn-catalog-loading">
          <CatalogProductGridSkeleton count={8} />
        </div>
      }
    >
      <CategoriesContent
        storeSlug={storeSlug}
        categorySlug={categoria}
        initialProductId={product?.trim() || null}
      />
    </Suspense>
  );
}
