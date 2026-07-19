"use client";

import Link from "next/link";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { isProductOutOfStock } from "@/lib/products/variants";
import { getStoreCatalogBasePath } from "@/lib/store-host";
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

function buildCategoryHref(basePath: string, categorySlug: string): string {
  const categoriesPath =
    basePath === "/"
      ? `/categorias?categoria=${encodeURIComponent(categorySlug)}`
      : `${basePath}/categorias?categoria=${encodeURIComponent(categorySlug)}`;

  return categoriesPath.replace("//", "/");
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
  const basePath = getStoreCatalogBasePath(store.slug);

  const availableProducts = products.filter(
    (product) => !isProductOutOfStock(product),
  );

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

      {storeCategories.length > 0 ? (
        <div className="catalog-category-chips" role="tablist" aria-label="Categorías">
          {storeCategories.map((category) => (
            <Link
              key={category.slug}
              href={buildCategoryHref(basePath, category.slug)}
              role="tab"
              aria-selected={selectedCategorySlug === category.slug}
              className={cn(
                "catalog-category-chip",
                selectedCategorySlug === category.slug &&
                  "catalog-category-chip-active",
              )}
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}

      <main className="txn-catalog-main">
        {availableProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              {storeCategories.length === 0
                ? "Esta tienda aún no tiene categorías configuradas"
                : "No hay productos en esta categoría"}
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              {storeCategories.length === 0
                ? "El dueño de la tienda puede configurarlas desde el panel."
                : "Prueba otra categoría o vuelve al inicio."}
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
            {availableProducts.map((product) => (
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
