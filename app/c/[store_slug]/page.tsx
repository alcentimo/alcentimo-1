import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalogProducts } from "@/lib/catalog";
import { getStoreBySlug } from "@/lib/stores";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  params: Promise<{ store_slug: string }>;
}

async function CatalogContent({ storeSlug }: { storeSlug: string }) {
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const [{ products, exchangeRate }, settingsConfig] = await Promise.all([
    getCatalogProducts({ storeSlug, limit: 500 }),
    getPublicStoreSettingsConfig(store.id),
  ]);

  const purchaseInfo = buildPublicPurchaseInfo(settingsConfig);

  return (
    <CartProvider storeSlug={storeSlug}>
      <TransactionalCatalog
        store={store}
        products={products}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
      />
    </CartProvider>
  );
}

export default async function TransactionalCatalogPage({
  params,
}: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;

  return (
    <Suspense
      fallback={
        <div className="txn-catalog-loading">Cargando catálogo…</div>
      }
    >
      <CatalogContent storeSlug={storeSlug} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `${store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${store.name}`,
  };
}
