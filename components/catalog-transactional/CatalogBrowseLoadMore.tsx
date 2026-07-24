"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface CatalogBrowseLoadMoreProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadMore: () => void;
  onRetry?: () => void;
}

export function CatalogBrowseLoadMore({
  visibleCount,
  totalCount,
  hasMore,
  loading = false,
  error = null,
  onLoadMore,
  onRetry,
}: CatalogBrowseLoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(loading);
  const autoLoadCooldownRef = useRef(false);

  onLoadMoreRef.current = onLoadMore;
  loadingRef.current = loading;

  useEffect(() => {
    if (!hasMore) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (loadingRef.current || autoLoadCooldownRef.current) return;

        autoLoadCooldownRef.current = true;
        onLoadMoreRef.current();

        window.setTimeout(() => {
          autoLoadCooldownRef.current = false;
        }, 400);
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  if (totalCount === 0) return null;

  return (
    <div className="catalog-browse-footer">
      <p className="catalog-browse-footer-count">
        Mostrando {Math.min(visibleCount, totalCount)} de {totalCount}
      </p>
      {error ? (
        <div className="catalog-browse-footer-error-wrap">
          <p className="catalog-browse-footer-error" role="alert">
            {error}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="catalog-browse-footer-retry"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}
      {hasMore ? (
        <>
          <div ref={sentinelRef} className="catalog-browse-sentinel" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              if (loadingRef.current) return;
              onLoadMoreRef.current();
            }}
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
        </>
      ) : null}
    </div>
  );
}
