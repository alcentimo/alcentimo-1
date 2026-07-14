"use client";

import { useMemo, useState } from "react";
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

  return (
    <div className="txn-catalog">
      <header className="txn-catalog-header">
        <div className="txn-catalog-header-inner">
          <div>
            <p className="txn-catalog-eyebrow">Catálogo</p>
            <h1 className="txn-catalog-title">{store.name}</h1>
            {store.description && (
              <p className="txn-catalog-desc">{store.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="txn-cart-btn"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span>Carrito</span>
            {itemCount > 0 && (
              <span className="txn-cart-badge">{itemCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="txn-catalog-main">
        {availableProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-base font-medium text-neutral-800">
              No hay productos disponibles
            </p>
            <p className="mt-2 text-sm text-neutral-500">
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
