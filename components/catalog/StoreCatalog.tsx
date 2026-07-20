"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogCurrencySettings } from "@/lib/store-settings/types";
import { formatExchangeRate } from "@/lib/format";
import { StoreHeader } from "@/components/catalog/StoreHeader";
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
  catalogCurrency: CatalogCurrencySettings;
}

export function StoreCatalog({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogCurrency,
}: StoreCatalogProps) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const [catalogProducts, setCatalogProducts] = useState(products);
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

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      const productId = item.product.product_id;
      map.set(productId, (map.get(productId) ?? 0) + item.quantity);
    }
    return map;
  }, [cartItems]);

  const addToCart = useCallback(
    (product: CatalogListItem, variant: CatalogVariantOption) => {
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
    },
    [liveExchangeRate, productById],
  );

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

  return (
    <div className="store-catalog-shell">
      <StoreHeader
        store={store}
        cartCount={cartCount}
        locationHours={purchaseInfo.locationHours}
        onCartClick={() => setCartOpen(true)}
      />

      <PageContainer className="store-catalog-main safe-area-inset">
        {store.description && (
          <p className="store-description">{store.description}</p>
        )}

        {showOfficialRate && exchangeRate && (
          <p className="store-rate-note">
            Tasa del día: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
          </p>
        )}

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
            ) : (
              <div className="store-product-grid">
                {catalogProducts.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    exchangeRate={liveExchangeRate}
                    showBsConversion={showBsConversion}
                    cartQuantity={cartQuantities.get(product.product_id) ?? 0}
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
            Catálogo de {store.name}
            {showBsConversion
              ? " · Precios en USD con referencia en bolívares."
              : " · Precios en USD."}
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
        showBsConversion={showBsConversion}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onOrderComplete={applyStockDeduction}
      />
    </div>
  );
}
