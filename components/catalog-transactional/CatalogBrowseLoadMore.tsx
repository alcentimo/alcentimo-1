"use client";

interface CatalogBrowseLoadMoreProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function CatalogBrowseLoadMore({
  visibleCount,
  totalCount,
  hasMore,
  onLoadMore,
}: CatalogBrowseLoadMoreProps) {
  if (totalCount === 0) return null;

  return (
    <div className="catalog-browse-footer">
      <p className="catalog-browse-footer-count">
        Mostrando {Math.min(visibleCount, totalCount)} de {totalCount}
      </p>
      {hasMore ? (
        <button type="button" onClick={onLoadMore} className="catalog-browse-load-more">
          Cargar más productos
        </button>
      ) : null}
    </div>
  );
}
