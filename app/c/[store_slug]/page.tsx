import { Suspense, use } from "react";
import { PublicCatalogPageClient } from "@/components/catalog-transactional/PublicCatalogPageClient";
import { CatalogStoreIdentityHeader } from "@/components/catalog-transactional/CatalogStoreIdentityHeader";
import { getPublicStoreBySlug } from "@/lib/stores";

interface CatalogPageProps {
  params: Promise<{ store_slug: string }>;
}

/**
 * Página síncrona: cero awaits de inventario.
 * Toda la data vive en PublicCatalogPageClient (useEffect).
 */
export default function TransactionalCatalogPage({ params }: CatalogPageProps) {
  const { store_slug: storeSlug } = use(params);

  return (
    <Suspense
      fallback={
        <div className="txn-catalog space-y-4 px-1 py-2">
          <CatalogStoreIdentityHeader
            storeName={storeSlug.replace(/-/g, " ")}
            eyebrow="Catálogo"
          />
          <p className="py-8 text-center text-sm text-zinc-500">
            Preparando el catálogo…
          </p>
        </div>
      }
    >
      <PublicCatalogPageClient />
    </Suspense>
  );
}

export async function generateMetadata({ params }: CatalogPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return { title: "Catálogo no encontrado" };
  }

  return {
    title: `${store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${store.name}`,
  };
}
