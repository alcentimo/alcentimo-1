interface CatalogProductGridSkeletonProps {
  count?: number;
  layout?: "grid" | "list";
}

export function CatalogProductGridSkeleton({
  count = 8,
  layout = "grid",
}: CatalogProductGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <div
      className={layout === "list" ? "txn-product-list" : "txn-product-grid"}
      aria-hidden="true"
    >
      {items.map((item) => (
        <div key={item} className="catalog-product-skeleton">
          <div className="catalog-product-skeleton-image" />
          <div className="catalog-product-skeleton-body">
            <div className="catalog-product-skeleton-line catalog-product-skeleton-line--title" />
            <div className="catalog-product-skeleton-line catalog-product-skeleton-line--price" />
          </div>
        </div>
      ))}
    </div>
  );
}
