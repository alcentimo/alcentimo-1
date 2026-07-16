import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalogProducts } from "@/lib/catalog";
import { getPublicStoreBySlug } from "@/lib/stores";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { StoreCatalog } from "@/components/catalog/StoreCatalog";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

async function StoreCatalogContent({ slug }: { slug: string }) {
  const store = await getPublicStoreBySlug(slug);

  if (!store) notFound();

  const [{ products, exchangeRate }, settingsConfig] = await Promise.all([
    getCatalogProducts({ storeSlug: slug, limit: 500 }),
    getPublicStoreSettingsConfig(store.id),
  ]);

  const purchaseInfo = buildPublicPurchaseInfo(settingsConfig);

  return (
    <StoreCatalog
      store={store}
      products={products}
      exchangeRate={exchangeRate}
      purchaseInfo={purchaseInfo}
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
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return { title: "Tienda no encontrada — alcentimo" };
  }

  return {
    title: `${store.name} — alcentimo`,
    description: store.description ?? `Catálogo digital de ${store.name}`,
  };
}
