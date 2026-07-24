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
  exchangeRate?: number | null;
  showOfficialRate?: boolean;
  showBsConversion?: boolean;
  openInitially?: boolean;
  /** Control externo del panel (p. ej. botón de carrito en header legacy). */
  panelView?: CartPanelView;
  onPanelViewChange?: (view: CartPanelView) => void;
  /** Oculta el FAB flotante cuando otro control abre el carrito. */
  showFab?: boolean;
}

export type CartPanelView = "closed" | "summary" | "checkout";

export function CatalogCartHost({
  store,
  purchaseInfo,
  exchangeRate = null,
  showOfficialRate = false,
  showBsConversion = false,
  openInitially = false,
  panelView: controlledPanelView,
  onPanelViewChange,
  showFab = true,
}: CatalogCartHostProps) {
  const { itemCount } = useCart();
  const { mode, selectedLocationId, locations } = useCatalogFulfillment();
  const defaultLocationId =
    locations.find((loc) => loc.is_default)?.id ?? locations[0]?.id ?? null;
  const orderLocationId = selectedLocationId ?? defaultLocationId;
  const isControlled =
    controlledPanelView !== undefined && onPanelViewChange !== undefined;
  const [internalPanelView, setInternalPanelView] = useState<CartPanelView>(
    openInitially ? "checkout" : "closed",
  );
  const panelView = isControlled ? controlledPanelView : internalPanelView;
  const setPanelView = isControlled ? onPanelViewChange : setInternalPanelView;
  const whatsappConfigured = Boolean(purchaseInfo.whatsappPhone?.trim());

  useEffect(() => {
    if (openInitially && !isControlled) {
      setInternalPanelView("checkout");
    }
  }, [openInitially, isControlled]);

  function closePanel() {
    setPanelView("closed");
  }

  return (
    <>
      {showFab ? (
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
      ) : null}

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
              exchangeRate={exchangeRate}
              showOfficialRate={showOfficialRate}
              showBsConversion={showBsConversion}
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
