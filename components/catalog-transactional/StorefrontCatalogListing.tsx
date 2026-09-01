"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import {
  officialBrandsToCatalogOptions,
  productBrandKey,
  resolveCatalogProductBrand,
  type CatalogBrandOption,
} from "@/lib/catalog/product-brand";
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
  storeSlug: string;
  onActivateProduct?: (card: MercadoProductCard) => void;
  exchangeRate: ExchangeRate | null;
  showOfficialRate: boolean;
  showBsConversion: boolean;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  extraAfterGrid?: ReactNode;
  onSelectBrand?: (brand: string | null) => void;
  featuredBrands?: CatalogBrandOption[];
}

function StorefrontListingFilters({
  browse,
  categoryFacets,
  brandFacets,
  priceBounds,
  onSelectBrand,
}: {
  browse: ReturnType<typeof useCatalogBrowse>;
  categoryFacets: Array<CatalogCategoryOption & { count: number }>;
  brandFacets: CatalogBrandOption[];
  priceBounds: { min: number; max: number };
  onSelectBrand?: (brand: string | null) => void;
}) {
  return (
    <StorefrontFiltersPanel
      categories={categoryFacets}
      activeCategorySlug={browse.categorySlug}
      onSelectCategory={browse.setCategorySlug}
      brands={brandFacets}
      activeBrand={browse.brand}
      onSelectBrand={onSelectBrand ?? browse.setBrand}
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
}

export function StorefrontCatalogListing({
  browse,
  catalogProducts,
  categoryOptions,
  mercadoCards,
  storeSlug,
  onActivateProduct,
  exchangeRate,
  showOfficialRate,
  showBsConversion,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  extraAfterGrid = null,
  onSelectBrand,
  featuredBrands = [],
}: StorefrontCatalogListingProps) {
  const pathname = usePathname();
  const getProductHref = useCallback(
    (product: MercadoProductCard) =>
      getStoreProductDeepLinkPath(
        storeSlug,
        product.product_slug?.trim() || product.product_id,
        { pathname },
      ),
    [pathname, storeSlug],
  );
  const isDepartmentView = Boolean(
    browse.appliedSearchQuery.trim() ||
      browse.categorySlug ||
      browse.brand ||
      browse.minPrice ||
      browse.maxPrice,
  );

  const brandFacets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of catalogProducts) {
      const name = resolveCatalogProductBrand(product);
      if (!name) continue;
      const key = productBrandKey(name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (featuredBrands.length > 0) {
      return officialBrandsToCatalogOptions(featuredBrands, counts);
    }
    return [];
  }, [catalogProducts, featuredBrands]);

  const activeCategoryName = categoryOptions.find(
    (category) => category.slug === browse.categorySlug,
  )?.name;

  const activeBrandName =
    browse.brand &&
    (brandFacets.find(
      (brand) => productBrandKey(brand.name) === productBrandKey(browse.brand!),
    )?.name ??
      browse.brand);

  const resultsTitle = browse.appliedSearchQuery.trim()
    ? `Resultados para “${browse.appliedSearchQuery.trim()}”`
    : activeBrandName
      ? `Marca ${activeBrandName}`
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
              getProductHref={getProductHref}
              onProductActivate={onActivateProduct}
              onSelectBrand={onSelectBrand ?? browse.setBrand}
              priceLabel="USD"
              priceHint={rateLabel}
              formatPriceSecondary={priceSecondary}
              ctaLabel="Ver producto"
              metaInStock="Envío a todo el país"
              metaOutOfStock="Sin stock"
              emptyTitle="No hay productos"
              emptyDescription="Prueba otra categoría, marca o limpia la búsqueda."
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
    <StorefrontListingFilters
      browse={browse}
      categoryFacets={categoryFacets}
      brandFacets={brandFacets}
      priceBounds={priceBounds}
      onSelectBrand={onSelectBrand ?? browse.setBrand}
    />
  );

  return (
    <div id="storefront-resultados" className="storefront-mp-listing">
      <div className="mercado-mp-results-head storefront-mp-results-head">
        <div>
          <h2 className="storefront-mp-results-title">{resultsTitle}</h2>
          <p className="storefront-mp-results-meta">
            {browse.totalCount} producto{browse.totalCount === 1 ? "" : "s"}
            {rateLabel ? ` · ${rateLabel}` : ""}
          </p>
        </div>
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
            {filtersPanel}
          </aside>
          <div className="mercado-mp-results">{grid}</div>
        </div>
      ) : (
        <div className="mercado-mp-results">{grid}</div>
      )}
    </div>
  );
}
