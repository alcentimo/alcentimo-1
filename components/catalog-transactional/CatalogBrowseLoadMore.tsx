"use client";

import { Loader2 } from "lucide-react";

interface CatalogBrowseLoadMoreProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadMore: () => void;
}

export function CatalogBrowseLoadMore({
  visibleCount,
  totalCount,
  hasMore,
  loading = false,
  error = null,
  onLoadMore,
}: CatalogBrowseLoadMoreProps) {
  if (totalCount === 0) return null;

  return (
    <div className="catalog-browse-footer">
      <p className="catalog-browse-footer-count">
        Mostrando {Math.min(visibleCount, totalCount)} de {totalCount}
      </p>
      {error ? (
        <p className="catalog-browse-footer-error" role="alert">
          {error}
        </p>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="catalog-browse-load-more"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando productos…
            </>
          ) : (
            "Cargar más productos"
          )}
        </button>
      ) : null}
    </div>
  );
}
