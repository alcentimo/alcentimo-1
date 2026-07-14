"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CheckoutPanel } from "@/components/catalog-transactional/CheckoutPanel";
import { isProductOutOfStock } from "@/lib/products/variants";

interface TransactionalCatalogProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
}

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function TransactionalCatalog({
  store,
  products,
  purchaseInfo,
}: TransactionalCatalogProps) {
  const { addItem, itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const availableProducts = useMemo(
    () => products.filter((product) => !isProductOutOfStock(product)),
    [products],
  );

  const whatsappConfigured = Boolean(purchaseInfo.whatsappPhone?.trim());
  const storeInitials = getStoreInitials(store.name);

  return (
    <div className="txn-catalog">
      <header className="txn-catalog-header">
        <div className="txn-catalog-header-inner">
          <div className="txn-catalog-brand">
            {store.logo_url ? (
              <div className="txn-store-logo">
                <Image
                  src={store.logo_url}
                  alt={`Logo de ${store.name}`}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="txn-store-logo-fallback" aria-hidden="true">
                {storeInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="txn-catalog-eyebrow">Catálogo</p>
              <h1 className="txn-catalog-title">{store.name}</h1>
              {store.description && (
                <p className="txn-catalog-desc">{store.description}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="txn-cart-btn"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Carrito</span>
            {itemCount > 0 && (
              <span className="txn-cart-badge">{itemCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="txn-catalog-main">
        {availableProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              No hay productos disponibles
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Vuelve pronto para ver el catálogo actualizado.
            </p>
          </div>
        ) : (
          <div className="txn-product-grid">
            {availableProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onAddToCart={addItem}
              />
            ))}
          </div>
        )}
      </main>

      {cartOpen && (
        <div className="txn-cart-overlay" role="presentation">
          <button
            type="button"
            className="txn-cart-backdrop"
            aria-label="Cerrar carrito"
            onClick={() => setCartOpen(false)}
          />
          <CheckoutPanel
            storeSlug={store.slug}
            storeName={store.name}
            whatsappConfigured={whatsappConfigured}
            onClose={() => setCartOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
