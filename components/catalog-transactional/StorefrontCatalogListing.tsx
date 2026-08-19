"use client";

import { useMemo, type ReactNode } from "react";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { CatalogBrowseLoadMore } from "@/components/catalog-transactional/CatalogBrowseLoadMore";
import { CatalogBrowseStatus } from "@/components/catalog-transactional/CatalogBrowseStatus";
import { StorefrontFiltersPanel } from "@/components/catalog-transactional/StorefrontFiltersPanel";
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import { MercadoProductGrid } from "@/components/mercado-oculto/MercadoProductGrid";
import { formatApproxBs, formatExchangeRate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

interface StorefrontCatalogListingProps {
  browse: ReturnType<typeof useCatalogBrowse>;
  catalogProducts: CatalogListItem[];
  categoryOptions: CatalogCategoryOption[];
  mercadoCards: MercadoProductCard[];
  onActivateProduct: (card: MercadoProductCard) => void;
  exchangeRate: ExchangeRate | null;
  showOfficialRate: boolean;
  showBsConversion: boolean;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  extraAfterGrid?: ReactNode;
}

export function StorefrontCatalogListing({
  browse,
  catalogProducts,
  categoryOptions,
  mercadoCards,
  onActivateProduct,
  exchangeRate,
  showOfficialRate,
  showBsConversion,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  extraAfterGrid = null,
}: StorefrontCatalogListingProps) {
  const isDepartmentView = Boolean(
    browse.searchQuery.trim() ||
      browse.categorySlug ||
      browse.minPrice ||
      browse.maxPrice,
  );

  const activeCategoryName = categoryOptions.find(
    (category) => category.slug === browse.categorySlug,
  )?.name;

  const resultsTitle = browse.searchQuery.trim()
    ? `Resultados para “${browse.searchQuery.trim()}”`
    : activeCategoryName
      ? activeCategoryName
      : "Productos destacados";

  const rate = exchangeRate?.rate ?? null;
  const rateLabel =
    showOfficialRate && rate != null
      ? `Tasa ${formatExchangeRate(rate)}`
      : null;

  const categoryFacets = useMemo(
    () =>
      categoryOptions.map((category) => ({
        ...category,
        count: catalogProducts.filter(
          (product) => product.category_slug === category.slug,
        ).length,
      })),
    [catalogProducts, categoryOptions],
  );

  const priceBounds = useMemo(() => {
    const prices = catalogProducts
      .map((product) => product.price_usd)
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [catalogProducts]);

  const priceSecondary = useMemo(() => {
    if (!showBsConversion || rate == null || rate <= 0) return undefined;
    return (product: MercadoProductCard) =>
      formatApproxBs(product.price_usd * rate);
  }, [rate, showBsConversion]);

  const grid = (
    <>
      {catalogProducts.length === 0 ? (
        <MercadoProductGrid
          products={[]}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      ) : browse.totalCount === 0 && !browse.loadingFilter ? (
        <MercadoProductGrid
          products={[]}
          emptyTitle={noResultsTitle}
          emptyDescription={noResultsDescription}
        />
      ) : (
        <>
          <CatalogBrowseStatus
            loading={browse.loadingFilter}
            error={
              browse.fetchErrorSource === "filter" ? browse.fetchError : null
            }
            onRetry={browse.retryFetch}
          />
          <div
            className={cn(
              browse.loadingFilter && "catalog-product-grid-updating",
            )}
          >
            <MercadoProductGrid
              products={mercadoCards}
              onProductActivate={onActivateProduct}
              priceLabel="USD"
              priceHint={rateLabel}
              formatPriceSecondary={priceSecondary}
              ctaLabel="Ver producto"
              metaInStock="Listo para pedir"
              metaOutOfStock="Sin stock por ahora"
              emptyTitle="Nada en esta vitrina"
              emptyDescription="Probá otra categoría o limpiá la búsqueda."
            />
            {extraAfterGrid}
          </div>
          <CatalogBrowseLoadMore
            visibleCount={browse.visibleCount}
            totalCount={browse.totalCount}
            hasMore={browse.hasMore}
            loading={browse.loadingMore}
            error={
              browse.fetchErrorSource === "more" ? browse.fetchError : null
            }
            onLoadMore={browse.loadMore}
            onRetry={browse.retryFetch}
          />
        </>
      )}
    </>
  );

  const filtersPanel = (
    <StorefrontFiltersPanel
      categories={categoryFacets}
      activeCategorySlug={browse.categorySlug}
      onSelectCategory={browse.setCategorySlug}
      minPrice={browse.minPrice}
      maxPrice={browse.maxPrice}
      onApplyPrice={(min, max) => {
        browse.setMinPrice(min);
        browse.setMaxPrice(max);
      }}
      onClear={browse.clearFilters}
      resultCount={browse.totalCount}
      priceMinPlaceholder={String(priceBounds.min)}
      priceMaxPlaceholder={String(priceBounds.max)}
      pending={browse.loadingFilter}
      hasActiveFilters={browse.hasActiveFilters}
    />
  );

  return (
    <div id="storefront-resultados" className="storefront-mp-listing">
      <div className="mercado-mp-results-head">
        <div>
          <p className="mercado-section-label">
            {isDepartmentView ? "Búsqueda y departamentos" : "Vitrina"}
          </p>
          <h2 className="mercado-heading text-xl sm:text-2xl">{resultsTitle}</h2>
          <p className="mercado-subheading mt-1">
            {rateLabel
              ? `Precios en USD · ${rateLabel}`
              : "Precios en USD · Compra protegida"}
          </p>
        </div>
        <p className="mercado-mp-results-count" aria-live="polite">
          <strong>{browse.totalCount}</strong>
          <span>
            {" "}
            producto{browse.totalCount === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      {isDepartmentView ? (
        <div className="mercado-mp-layout storefront-mp-browse-layout">
          <details className="storefront-mp-filters-mobile lg:hidden" open>
            <summary className="storefront-mp-filters-toggle">Filtros</summary>
            <aside className="mercado-mp-filters" aria-label="Filtros del catálogo">
              {filtersPanel}
            </aside>
          </details>
          <aside
            className="mercado-mp-filters hidden lg:block"
            aria-label="Filtros del catálogo"
          >
            <StorefrontFiltersPanel
              categories={categoryFacets}
              activeCategorySlug={browse.categorySlug}
              onSelectCategory={browse.setCategorySlug}
              minPrice={browse.minPrice}
              maxPrice={browse.maxPrice}
              onApplyPrice={(min, max) => {
                browse.setMinPrice(min);
                browse.setMaxPrice(max);
              }}
              onClear={browse.clearFilters}
              resultCount={browse.totalCount}
              priceMinPlaceholder={String(priceBounds.min)}
              priceMaxPlaceholder={String(priceBounds.max)}
              pending={browse.loadingFilter}
              hasActiveFilters={browse.hasActiveFilters}
            />
          </aside>
          <div className="mercado-mp-results">{grid}</div>
        </div>
      ) : (
        <div className="mercado-mp-results">{grid}</div>
      )}
    </div>
  );
}
