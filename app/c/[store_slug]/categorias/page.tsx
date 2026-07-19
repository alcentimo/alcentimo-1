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
