"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CartSummaryPanel } from "@/components/catalog-transactional/CartSummaryPanel";
import { CheckoutPanel } from "@/components/catalog-transactional/CheckoutPanel";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

interface CatalogCartHostProps {
  store: Pick<Store, "slug" | "name">;
  purchaseInfo: PublicPurchaseInfo;
  openInitially?: boolean;
}

type CartPanelView = "closed" | "summary" | "checkout";

export function CatalogCartHost({
  store,
  purchaseInfo,
  openInitially = false,
}: CatalogCartHostProps) {
  const { itemCount } = useCart();
  const { mode, selectedLocationId, locations } = useCatalogFulfillment();
  const defaultLocationId =
    locations.find((loc) => loc.is_default)?.id ?? locations[0]?.id ?? null;
  const orderLocationId = selectedLocationId ?? defaultLocationId;
  const [panelView, setPanelView] = useState<CartPanelView>(
    openInitially ? "checkout" : "closed",
  );
  const whatsappConfigured = Boolean(purchaseInfo.whatsappPhone?.trim());

  useEffect(() => {
    if (openInitially) {
      setPanelView("checkout");
    }
  }, [openInitially]);

  function closePanel() {
    setPanelView("closed");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelView("summary")}
        className="catalog-cart-fab"
        aria-label={`Ver carrito${itemCount > 0 ? `, ${itemCount} productos` : ""}`}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {itemCount > 0 ? (
          <span className="catalog-cart-fab-badge">{itemCount}</span>
        ) : null}
      </button>

      {panelView !== "closed" ? (
        <div className="txn-cart-overlay" role="presentation">
          <button
            type="button"
            className="txn-cart-backdrop"
            aria-label="Cerrar carrito"
            onClick={closePanel}
          />
          {panelView === "summary" ? (
            <CartSummaryPanel
              storeName={store.name}
              whatsappPhone={purchaseInfo.whatsappPhone}
              onClose={closePanel}
              onCheckout={() => setPanelView("checkout")}
            />
          ) : (
            <CheckoutPanel
              storeSlug={store.slug}
              storeName={store.name}
              purchaseInfo={purchaseInfo}
              whatsappConfigured={whatsappConfigured}
              onClose={closePanel}
              fulfillmentMode={mode}
              locationId={orderLocationId}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
