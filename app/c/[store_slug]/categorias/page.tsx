import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogCategoriesView } from "@/components/catalog-transactional/CatalogCategoriesView";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CatalogCategoriesPageProps {
  params: Promise<{ store_slug: string }>;
  searchParams: Promise<{ categoria?: string }>;
}

async function CategoriesContent({
  storeSlug,
  categorySlug,
}: {
  storeSlug: string;
  categorySlug?: string;
}) {
  const data = await getPublicCatalogPageData(storeSlug);
  if (!data) notFound();

  const requested = categorySlug?.trim().toLowerCase() ?? "";
  const isAllowed = data.storeCategories.some(
    (category) => category.slug === requested,
  );
  const selectedCategorySlug =
    requested && isAllowed
      ? requested
      : (data.storeCategories[0]?.slug ?? null);

  const {
    store,
    products,
    storeCategories,
    exchangeRate,
    purchaseInfo,
    catalogDesign,
    catalogCurrency,
    locations,
    locationStocks,
  } = data;

  return (
    <CatalogCategoriesView
      store={store}
      products={products}
      storeCategories={storeCategories}
      selectedCategorySlug={selectedCategorySlug}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogDesign={catalogDesign}
      catalogCurrency={catalogCurrency}
      locations={locations}
      locationStocks={locationStocks}
    />
  );
}

export default async function CatalogCategoriesPage({
  params,
  searchParams,
}: CatalogCategoriesPageProps) {
  const { store_slug: storeSlug } = await params;
  const { categoria } = await searchParams;

  return (
    <Suspense fallback={<div className="txn-catalog-loading">Cargando…</div>}>
      <CategoriesContent storeSlug={storeSlug} categorySlug={categoria} />
    </Suspense>
  );
}
