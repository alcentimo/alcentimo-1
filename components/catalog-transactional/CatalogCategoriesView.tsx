"use client";

import { useMemo } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { CatalogBrowseToolbar } from "@/components/catalog-transactional/CatalogBrowseToolbar";
import { CatalogBrowseLoadMore } from "@/components/catalog-transactional/CatalogBrowseLoadMore";
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import { isProductOutOfStock } from "@/lib/products/variants";
import { cn } from "@/lib/cn";

interface CatalogCategoriesViewProps {
  store: Store;
  products: CatalogListItem[];
  storeCategories: CatalogCategoryOption[];
  selectedCategorySlug: string | null;
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
}

export function CatalogCategoriesView({
  store,
  products,
  storeCategories,
  selectedCategorySlug,
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
}: CatalogCategoriesViewProps) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showBsConversion } = catalogCurrency;
  const { addItem } = useCart();

  const availableProducts = useMemo(
    () => products.filter((product) => !isProductOutOfStock(product)),
    [products],
  );

  const browse = useCatalogBrowse(availableProducts, {
    initialCategorySlug: selectedCategorySlug,
  });

  const gridClassName =
    catalogDesign.layout === "list" ? "txn-product-list" : "txn-product-grid";

  return (
    <div
      className={cn(
        "txn-catalog txn-catalog-subpage",
        getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
      )}
      style={getCatalogThemeStyle(catalogDesign, store.rubro_tienda)}
    >
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Categorías</h1>
        <p className="catalog-subpage-desc">
          Explora productos por categoría en {store.name}.
        </p>
      </header>

      {availableProducts.length > 0 ? (
        <CatalogBrowseToolbar
          searchQuery={browse.searchQuery}
          onSearchQueryChange={browse.setSearchQuery}
          categorySlug={browse.categorySlug}
          onCategorySlugChange={browse.setCategorySlug}
          sortKey={browse.sortKey}
          onSortKeyChange={browse.setSortKey}
          categories={storeCategories}
          totalCount={availableProducts.length}
          filteredCount={browse.totalCount}
          hasActiveFilters={browse.hasActiveFilters}
          onClearFilters={browse.clearFilters}
        />
      ) : null}

      <main className="txn-catalog-main">
        {availableProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              {storeCategories.length === 0
                ? "Esta tienda aún no tiene categorías configuradas"
                : "No hay productos disponibles"}
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              {storeCategories.length === 0
                ? "El dueño de la tienda puede configurarlas desde el panel."
                : "Vuelve pronto para ver el catálogo actualizado."}
            </p>
          </div>
        ) : browse.totalCount === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              No hay productos en esta categoría
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Prueba otra categoría o limpia los filtros.
            </p>
          </div>
        ) : (
          <>
            <div className={gridClassName}>
              {browse.visibleProducts.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  exchangeRate={liveExchangeRate}
                  showBsConversion={showBsConversion}
                  catalogVisibility={catalogDesign.visibility}
                  storeRubro={store.rubro_tienda}
                  onAddToCart={addItem}
                />
              ))}
            </div>
            <CatalogBrowseLoadMore
              visibleCount={browse.visibleCount}
              totalCount={browse.totalCount}
              hasMore={browse.hasMore}
              onLoadMore={browse.loadMore}
            />
          </>
        )}
      </main>

      <CatalogCartHost store={store} purchaseInfo={purchaseInfo} />
    </div>
  );
}
