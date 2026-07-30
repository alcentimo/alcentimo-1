import { CatalogStoreIdentityHeader } from "@/components/catalog-transactional/CatalogStoreIdentityHeader";

export default function PublicCatalogLoading() {
  return (
    <div className="txn-catalog space-y-4 px-1 py-2">
      <CatalogStoreIdentityHeader storeName="Catálogo" eyebrow="Catálogo" />
      <p className="py-8 text-center text-sm text-zinc-500">
        Preparando el catálogo…
      </p>
    </div>
  );
}
