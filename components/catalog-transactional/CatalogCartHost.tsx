"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CartSummaryPanel } from "@/components/catalog-transactional/CartSummaryPanel";
import { CheckoutPanel } from "@/components/catalog-transactional/CheckoutPanel";
import { CheckoutErrorBoundary } from "@/components/catalog-transactional/CheckoutErrorBoundary";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import type { CheckoutType } from "@/lib/store-settings/types";
import {
  cartItemsAreGiftCardsOnly,
  isGiftCardCatalogItem,
} from "@/lib/gift-cards/catalog";

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
  /**
   * Demo / landing: el checkout real se sustituye por envío vía WhatsApp.
   */
  sandboxMode?: boolean;
}

export type CartPanelView = "closed" | "summary" | "checkout";

function resolveCheckoutType(
  purchaseInfo: PublicPurchaseInfo,
  sandboxMode: boolean,
  hasGiftCard: boolean,
): CheckoutType {
  if (sandboxMode) return "direct_whatsapp";
  if (hasGiftCard && purchaseInfo.checkoutType === "direct_whatsapp") {
    return "full_checkout";
  }
  return purchaseInfo.checkoutType;
}

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
  sandboxMode = false,
}: CatalogCartHostProps) {
  const { itemCount, items } = useCart();
  const { mode, selectedLocationId, locations } = useCatalogFulfillment();
  const defaultLocationId =
    locations.find((loc) => loc.is_default)?.id ?? locations[0]?.id ?? null;
  const orderLocationId = selectedLocationId ?? defaultLocationId;
  const isControlled =
    controlledPanelView !== undefined && onPanelViewChange !== undefined;

  const checkoutType = resolveCheckoutType(
    purchaseInfo,
    sandboxMode,
    items.some((item) => isGiftCardCatalogItem(item.product)),
  );
  const digitalGiftOnly = cartItemsAreGiftCardsOnly(items);
  const showFullCheckoutCta =
    checkoutType === "both" || checkoutType === "full_checkout";
  const showWhatsAppCta =
    !digitalGiftOnly &&
    (checkoutType === "both" || checkoutType === "direct_whatsapp");
  const whatsappOnly = !digitalGiftOnly && checkoutType === "direct_whatsapp";

  const initialView: CartPanelView = openInitially
    ? showFullCheckoutCta
      ? "checkout"
      : "summary"
    : "closed";

  const [internalPanelView, setInternalPanelView] =
    useState<CartPanelView>(initialView);
  const panelView = isControlled ? controlledPanelView : internalPanelView;
  const setPanelView = isControlled ? onPanelViewChange : setInternalPanelView;
  const whatsappPhone =
    purchaseInfo.whatsappPhone?.trim() ||
    purchaseInfo.whatsappPhones.find((phone) => phone.trim())?.trim() ||
    "";
  const whatsappConfigured = Boolean(whatsappPhone);

  useEffect(() => {
    if (openInitially && !isControlled) {
      setInternalPanelView(showFullCheckoutCta ? "checkout" : "summary");
    }
  }, [openInitially, isControlled, showFullCheckoutCta]);

  function closePanel() {
    setPanelView("closed");
  }

  const showSummary =
    panelView === "summary" || (panelView === "checkout" && whatsappOnly);
  const showCheckout = panelView === "checkout" && showFullCheckoutCta;

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
          {showSummary ? (
            <CheckoutErrorBoundary
              onClose={closePanel}
              onRetry={() => setPanelView("summary")}
            >
              <CartSummaryPanel
                storeName={store.name}
                whatsappPhone={whatsappPhone}
                onClose={closePanel}
                onCheckout={() => setPanelView("checkout")}
                exchangeRate={exchangeRate}
                showBsConversion={showBsConversion}
                showFullCheckoutCta={showFullCheckoutCta}
                showWhatsAppCta={showWhatsAppCta}
                whatsappAsPrimary={whatsappOnly}
                checkoutCtaLabel="Finalizar pedido"
                whatsappCtaLabel={
                  sandboxMode
                    ? "Enviar pedido por WhatsApp"
                    : whatsappOnly
                      ? "Finalizar pedido por WhatsApp"
                      : "Pedir directo por WhatsApp"
                }
                whatsappHint={
                  sandboxMode
                    ? "Demo interactiva · El pedido se abre en WhatsApp sin guardar en el servidor."
                    : whatsappOnly
                      ? "Tu pedido se envía por WhatsApp con el resumen del carrito."
                      : whatsappConfigured
                        ? "Puedes finalizar en la web y, si quieres, avisar por WhatsApp desde la confirmación."
                        : "Configura WhatsApp en la tienda para recibir pedidos."
                }
              />
            </CheckoutErrorBoundary>
          ) : null}

          {showCheckout ? (
            <CheckoutErrorBoundary
              onClose={closePanel}
              onRetry={() => setPanelView("checkout")}
            >
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
                initialStep={2}
                onBackToCart={() => setPanelView("summary")}
              />
            </CheckoutErrorBoundary>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
