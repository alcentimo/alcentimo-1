"use client";

import { useMemo, useState } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { extractCatalogCategories } from "@/lib/catalog/extract-categories";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { isProductOutOfStock } from "@/lib/products/variants";
import { cn } from "@/lib/cn";

interface CatalogCategoriesViewProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
}

export function CatalogCategoriesView({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
}: CatalogCategoriesViewProps) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showBsConversion } = catalogCurrency;
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const availableProducts = useMemo(
    () => products.filter((product) => !isProductOutOfStock(product)),
    [products],
  );

  const categories = useMemo(
    () => extractCatalogCategories(availableProducts),
    [availableProducts],
  );

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return availableProducts;
    return availableProducts.filter(
      (product) => product.category_slug === selectedCategory,
    );
  }, [availableProducts, selectedCategory]);

  return (
    <div
      className={cn(
        "txn-catalog txn-catalog-subpage",
        getCatalogDesignClasses(catalogDesign),
      )}
      style={getCatalogThemeStyle(catalogDesign)}
    >
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Categorías</h1>
        <p className="catalog-subpage-desc">
          Explora productos por categoría en {store.name}.
        </p>
      </header>

      {categories.length > 0 ? (
        <div className="catalog-category-chips" role="tablist" aria-label="Categorías">
          <button
            type="button"
            role="tab"
            aria-selected={!selectedCategory}
            onClick={() => setSelectedCategory("")}
            className={cn(
              "catalog-category-chip",
              !selectedCategory && "catalog-category-chip-active",
            )}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category.slug}
              onClick={() => setSelectedCategory(category.slug)}
              className={cn(
                "catalog-category-chip",
                selectedCategory === category.slug && "catalog-category-chip-active",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      <main className="txn-catalog-main">
        {filteredProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              No hay productos en esta categoría
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Prueba otra categoría o vuelve al inicio.
            </p>
          </div>
        ) : (
          <div
            className={
              catalogDesign.layout === "list"
                ? "txn-product-list"
                : "txn-product-grid"
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                exchangeRate={liveExchangeRate}
                showBsConversion={showBsConversion}
                catalogVisibility={catalogDesign.visibility}
                onAddToCart={addItem}
              />
            ))}
          </div>
        )}
      </main>

      <CatalogCartHost store={store} purchaseInfo={purchaseInfo} />
    </div>
  );
}
