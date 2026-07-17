import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CatalogPageProps {
  params: Promise<{ store_slug: string }>;
}

async function CatalogContent({ storeSlug }: { storeSlug: string }) {
  const data = await getPublicCatalogPageData(storeSlug);
  if (!data) notFound();

  const { store, products, exchangeRate, purchaseInfo, catalogDesign, catalogCurrency } =
    data;

  return (
    <CartProvider storeSlug={store.slug}>
      <TransactionalCatalog
        store={store}
        products={products}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
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
  const data = await getPublicCatalogPageData(storeSlug);

  if (!data) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `${data.store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${data.store.name}`,
  };
}
