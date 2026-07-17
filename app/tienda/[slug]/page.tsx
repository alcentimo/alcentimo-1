import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { StoreCatalog } from "@/components/catalog/StoreCatalog";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

async function StoreCatalogContent({ slug }: { slug: string }) {
  const data = await getPublicCatalogPageData(slug);
  if (!data) notFound();

  const { store, products, exchangeRate, purchaseInfo, catalogCurrency } = data;

  return (
    <StoreCatalog
      store={store}
      products={products}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogCurrency={catalogCurrency}
    />
  );
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <StoreCatalogContent slug={slug} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: StorePageProps) {
  const { slug } = await params;
  const data = await getPublicCatalogPageData(slug);

  if (!data) {
    return { title: "Tienda no encontrada — alcentimo" };
  }

  return {
    title: `${data.store.name} — alcentimo`,
    description:
      data.store.description ?? `Catálogo digital de ${data.store.name}`,
  };
}
