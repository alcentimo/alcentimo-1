"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CheckoutPanel } from "@/components/catalog-transactional/CheckoutPanel";

interface CatalogCartHostProps {
  store: Pick<Store, "slug" | "name">;
  purchaseInfo: PublicPurchaseInfo;
  openInitially?: boolean;
}

export function CatalogCartHost({
  store,
  purchaseInfo,
  openInitially = false,
}: CatalogCartHostProps) {
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(openInitially);
  const whatsappConfigured = Boolean(purchaseInfo.whatsappPhone?.trim());

  useEffect(() => {
    if (openInitially) {
      setCartOpen(true);
    }
  }, [openInitially]);

  return (
    <>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="catalog-cart-fab"
        aria-label={`Abrir carrito${itemCount > 0 ? `, ${itemCount} productos` : ""}`}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {itemCount > 0 ? (
          <span className="catalog-cart-fab-badge">{itemCount}</span>
        ) : null}
      </button>

      {cartOpen ? (
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
            purchaseInfo={purchaseInfo}
            whatsappConfigured={whatsappConfigured}
            onClose={() => setCartOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}
