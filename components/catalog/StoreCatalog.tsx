"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { formatExchangeRate } from "@/lib/format";
import { StoreHeader } from "@/components/catalog/StoreHeader";
import {
  CatalogToolbar,
  type CatalogCategory,
} from "@/components/catalog/CatalogToolbar";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PurchaseInfoPanel } from "@/components/catalog/PurchaseInfoPanel";
import { CartDrawer } from "@/components/catalog/CartDrawer";
import {
  buildCartItem,
  cartItemKey,
  type CartItem,
} from "@/lib/catalog/cart-types";
import {
  getCatalogVariantOptions,
  parseVariantsJson,
} from "@/lib/products/variants";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { PageContainer } from "@/components/ui/PageContainer";

interface StoreCatalogProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
}

function extractCategories(products: CatalogListItem[]): CatalogCategory[] {
  const map = new Map<string, CatalogCategory>();

  for (const product of products) {
    if (!product.category_slug || !product.category_name) continue;
    map.set(product.category_slug, {
      slug: product.category_slug,
      name: product.category_name,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="store-empty-state">
      <p className="text-base font-medium text-zinc-800">No hay productos que coincidan</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        Prueba con otro término de búsqueda o selecciona otra categoría.
      </p>
      <button type="button" onClick={onReset} className="store-reset-btn">
        Limpiar filtros
      </button>
    </div>
  );
}

export function StoreCatalog({
  store,
  products,
  exchangeRate,
  purchaseInfo,
}: StoreCatalogProps) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map<string, CatalogListItem>();
    for (const product of catalogProducts) {
      map.set(product.product_id, product);
    }
    return map;
  }, [catalogProducts]);

  const categories = useMemo(() => extractCategories(catalogProducts), [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalogProducts.filter((product) => {
      const matchesCategory =
        !categorySlug || product.category_slug === categorySlug;

      if (!normalizedQuery) return matchesCategory;

      const haystack = [
        product.product_name,
        product.short_description ?? "",
        product.category_name ?? "",
        product.brand ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && haystack.includes(normalizedQuery);
    });
  }, [catalogProducts, query, categorySlug]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function getCartQuantity(productId: string, variantId?: string) {
    if (variantId) {
      return (
        cartItems.find(
          (item) =>
            item.product.product_id === productId && item.variantId === variantId,
        )?.quantity ?? 0
      );
    }
    return cartItems
      .filter((item) => item.product.product_id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  function addToCart(product: CatalogListItem, variant: CatalogVariantOption) {
    const live = productById.get(product.product_id) ?? product;
    const liveVariant =
      getCatalogVariantOptions(live, liveExchangeRate).find(
        (option) => option.id === variant.id,
      ) ?? variant;

    if (liveVariant.availableStock <= 0) return;

    const key = cartItemKey(live.product_id, liveVariant.id);

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => cartItemKey(item.product.product_id, item.variantId) === key,
      );
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > liveVariant.availableStock) return prev;

      if (existing) {
        return prev.map((item) =>
          cartItemKey(item.product.product_id, item.variantId) === key
            ? {
                ...buildCartItem(live, liveVariant, nextQty),
              }
            : item,
        );
      }
      return [...prev, buildCartItem(live, liveVariant, 1)];
    });
    setCartOpen(true);
  }

  function removeFromCart(productId: string, variantId: string) {
    const key = cartItemKey(productId, variantId);
    setCartItems((prev) =>
      prev.filter((item) => cartItemKey(item.product.product_id, item.variantId) !== key),
    );
  }

  function updateCartQuantity(productId: string, variantId: string, quantity: number) {
    const live = productById.get(productId);
    if (!live) return;

    const liveVariant = getCatalogVariantOptions(live, liveExchangeRate).find(
      (option) => option.id === variantId,
    );
    if (!liveVariant) return;

    const nextQty = Math.min(Math.max(1, quantity), liveVariant.availableStock);
    const key = cartItemKey(productId, variantId);

    setCartItems((prev) =>
      prev.map((item) =>
        cartItemKey(item.product.product_id, item.variantId) === key
          ? buildCartItem(live, liveVariant, nextQty)
          : item,
      ),
    );
  }

  function applyStockDeduction(items: CartItem[]) {
    setCatalogProducts((prev) =>
      prev.map((product) => {
        const orderedLines = items.filter(
          (item) => item.product.product_id === product.product_id,
        );
        if (orderedLines.length === 0) return product;

        const customVariants = parseVariantsJson(product.product_variants);
        if (customVariants.length > 0) {
          const updatedVariants = customVariants.map((variant) => {
            const ordered = orderedLines.find((line) => line.variantId === variant.id);
            if (!ordered) return variant;
            return {
              ...variant,
              stock: Math.max(0, variant.stock - ordered.quantity),
            };
          });

          return {
            ...product,
            product_variants: updatedVariants,
          };
        }

        const totalOrdered = orderedLines.reduce((sum, line) => sum + line.quantity, 0);
        return {
          ...product,
          available_stock: Math.max(0, product.available_stock - totalOrdered),
          stock_quantity: Math.max(0, product.stock_quantity - totalOrdered),
        };
      }),
    );
    setCartItems([]);
  }

  function resetFilters() {
    setQuery("");
    setCategorySlug("");
  }

  return (
    <div className="store-catalog-shell">
      <StoreHeader
        store={store}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
      />

      <PageContainer className="store-catalog-main safe-area-inset">
        {store.description && (
          <p className="store-description">{store.description}</p>
        )}

        {exchangeRate && (
          <p className="store-rate-note">
            Tasa del día: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
          </p>
        )}

        <CatalogToolbar
          query={query}
          onQueryChange={setQuery}
          categorySlug={categorySlug}
          onCategoryChange={setCategorySlug}
          categories={categories}
          resultCount={filteredProducts.length}
        />

        <div className="store-catalog-layout">
          <main className="store-catalog-products">
            {catalogProducts.length === 0 ? (
              <div className="store-empty-state">
                <p className="text-base font-medium text-zinc-800">
                  Esta tienda aún no tiene productos
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Vuelve pronto para ver novedades.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : (
              <div className="store-product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    exchangeRate={liveExchangeRate}
                    cartQuantity={getCartQuantity(product.product_id)}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </main>

          <PurchaseInfoPanel purchaseInfo={purchaseInfo} />
        </div>
      </PageContainer>

      <footer className="store-footer safe-area-bottom">
        <PageContainer className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-zinc-500">
            Catálogo de {store.name} · Precios en USD con referencia en bolívares.
          </p>
          <Link href="/" className="text-xs font-medium text-zinc-700 hover:text-zinc-900">
            Creado con alcentimo
          </Link>
        </PageContainer>
      </footer>

      <CartDrawer
        open={cartOpen}
        storeSlug={store.slug}
        storeName={store.name}
        purchaseInfo={purchaseInfo}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onOrderComplete={applyStockDeduction}
      />
    </div>
  );
}
