import { CatalogProductGridSkeleton } from "@/components/catalog/CatalogProductGridSkeleton";

export default function PublicCatalogLoading() {
  return (
    <div className="txn-catalog-loading">
      <CatalogProductGridSkeleton count={8} />
    </div>
  );
}
