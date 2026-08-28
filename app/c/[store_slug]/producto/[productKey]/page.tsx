import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { fetchPublicCatalogProductById } from "@/lib/catalog/public-actions";
import { CatalogStoreProductView } from "@/components/catalog-transactional/CatalogStoreProductView";
import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";
import { getPublicStoreBySlug } from "@/lib/stores";

export const dynamic = "force-dynamic";

interface ProductDeepLinkPageProps {
  params: Promise<{ store_slug: string; productKey: string }>;
}

async function ProductDeepLinkContent({
  storeSlug,
  productKey,
}: {
  storeSlug: string;
  productKey: string;
}) {
  const data = await getPublicCatalogPageData(storeSlug);
  if (!data) notFound();

  const listed = data.products.find(
    (item) =>
      item.product_id.toLowerCase() === productKey.toLowerCase() ||
      item.product_slug.toLowerCase() === productKey.toLowerCase(),
  );
  const { product } = listed
    ? { product: listed }
    : await fetchPublicCatalogProductById(storeSlug, productKey);
  if (!product) notFound();

  return (
    <CatalogStoreProductView
      store={data.store}
      product={product}
      exchangeRate={data.exchangeRate}
      purchaseInfo={data.purchaseInfo}
      catalogDesign={data.catalogDesign}
      catalogCurrency={data.catalogCurrency}
      locations={data.locations}
      locationStocks={data.locationStocks}
    />
  );
}

export default async function StoreProductDeepLinkPage({
  params,
}: ProductDeepLinkPageProps) {
  const { store_slug: storeSlug, productKey } = await params;
  const key = decodeURIComponent(productKey).trim();
  if (!key) notFound();

  return (
    <Suspense
      fallback={
        <div className="txn-catalog-loading">
          <CatalogProductGridSkeleton count={4} />
        </div>
      }
    >
      <ProductDeepLinkContent storeSlug={storeSlug} productKey={key} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: ProductDeepLinkPageProps) {
  const { store_slug: storeSlug, productKey } = await params;
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) return { title: "Catálogo no encontrado" };

  const key = decodeURIComponent(productKey).trim();
  const { product } = await fetchPublicCatalogProductById(storeSlug, key);
  if (!product) {
    return {
      title: `${store.name} — Pedidos`,
      description: `Catálogo y pedidos de ${store.name}`,
    };
  }

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
