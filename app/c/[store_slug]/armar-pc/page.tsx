import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PCBuilderView } from "@/components/rubros/tecnologia/PCBuilderView";
import { getCatalogProducts } from "@/lib/catalog";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";

// HTML dinámico (sesión/carrito). Los productos van al Data Cache (~60s + tags).
export const dynamic = "force-dynamic";

interface PCBuilderPageProps {
  params: Promise<{ store_slug: string }>;
}

async function PCBuilderContent({ storeSlug }: { storeSlug: string }) {
  const pageData = await getPublicCatalogPageData(storeSlug);
  if (!pageData) notFound();

  const { store, purchaseInfo, catalogCurrency } = pageData;

  if (!storeHasPCBuilder(store.rubro_tienda, store.enable_pc_builder)) {
    notFound();
  }

  const catalogData = await getCatalogProducts({
    storeSlug: store.slug,
    limit: 5000,
    offset: 0,
  });

  return (
    <PCBuilderView
      store={store}
      products={catalogData.products}
      exchangeRate={catalogData.exchangeRate}
      purchaseInfo={purchaseInfo}
      catalogCurrency={catalogCurrency}
    />
  );
}

export default async function PCBuilderPage({ params }: PCBuilderPageProps) {
  const { store_slug: storeSlug } = await params;

  return (
    <Suspense fallback={<div className="txn-catalog-loading">Cargando…</div>}>
      <PCBuilderContent storeSlug={storeSlug} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PCBuilderPageProps) {
  const { store_slug: storeSlug } = await params;
  const pageData = await getPublicCatalogPageData(storeSlug);

  if (!pageData) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `Arma tu PC — ${pageData.store.name}`,
    description: `Configura tu computadora personalizada con los componentes de ${pageData.store.name}.`,
  };
}
