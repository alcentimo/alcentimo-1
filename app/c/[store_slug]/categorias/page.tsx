import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogCategoriesView } from "@/components/catalog-transactional/CatalogCategoriesView";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CatalogCategoriesPageProps {
  params: Promise<{ store_slug: string }>;
}

async function CategoriesContent({ storeSlug }: { storeSlug: string }) {
  const data = await getPublicCatalogPageData(storeSlug);
  if (!data) notFound();

  const { store, products, storeCategories, exchangeRate, purchaseInfo, catalogDesign, catalogCurrency } =
    data;

  return (
    <CatalogCategoriesView
      store={store}
      products={products}
      storeCategories={storeCategories}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogDesign={catalogDesign}
      catalogCurrency={catalogCurrency}
    />
  );
}

export default async function CatalogCategoriesPage({
  params,
}: CatalogCategoriesPageProps) {
  const { store_slug: storeSlug } = await params;

  return (
    <Suspense fallback={<div className="txn-catalog-loading">Cargando…</div>}>
      <CategoriesContent storeSlug={storeSlug} />
    </Suspense>
  );
}
