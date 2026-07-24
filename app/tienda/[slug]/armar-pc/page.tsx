import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PCBuilderView } from "@/components/rubros/tecnologia/PCBuilderView";
import { getCatalogProducts } from "@/lib/catalog";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { getStoreCatalogUrl } from "@/lib/stores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LegacyPCBuilderPageProps {
  params: Promise<{ slug: string }>;
}

async function LegacyPCBuilderContent({ slug }: { slug: string }) {
  const pageData = await getPublicCatalogPageData(slug);
  if (!pageData) notFound();

  const { store, purchaseInfo, catalogCurrency } = pageData;

  if (!storeHasPCBuilder(store.rubro_tienda)) {
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
      catalogBasePath={getStoreCatalogUrl(store.slug)}
      showTabBarPadding={false}
    />
  );
}

export default async function LegacyPCBuilderPage({ params }: LegacyPCBuilderPageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="txn-catalog-loading">Cargando…</div>}>
      <LegacyPCBuilderContent slug={slug} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: LegacyPCBuilderPageProps) {
  const { slug } = await params;
  const pageData = await getPublicCatalogPageData(slug);

  if (!pageData) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `Arma tu PC — ${pageData.store.name}`,
    description: `Configura tu computadora personalizada con los componentes de ${pageData.store.name}.`,
  };
}
