import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { fetchPublicCatalogProductById } from "@/lib/catalog/public-actions";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";
import { getPublicStoreBySlug } from "@/lib/stores";

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
  initialProductId,
}: {
  storeSlug: string;
  openCheckoutInitially: boolean;
  openCartInitially: boolean;
  initialProductId?: string | null;
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
      initialProductId={initialProductId}
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
        initialProductId={initialProductId}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params, searchParams }: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return { title: "Catálogo no encontrado" };
  }

  const productKey = (await searchParams).product?.trim();
  if (productKey) {
    const { product } = await fetchPublicCatalogProductById(storeSlug, productKey);
    if (product) {
      const description =
        product.short_description?.trim() ||
        `Compra ${product.product_name} en ${store.name}`;
      return {
        title: `${product.product_name} — ${store.name}`,
        description,
        openGraph: {
          title: product.product_name,
          description,
          images: product.thumb_url ? [{ url: product.thumb_url }] : undefined,
        },
      };
    }
  }

  return {
    title: `${store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${store.name}`,
  };
}
