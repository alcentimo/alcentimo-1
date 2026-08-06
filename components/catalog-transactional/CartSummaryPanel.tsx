"use client";

import { MessageCircle, ShoppingBag, X } from "lucide-react";
import { buildCartWhatsAppMessage } from "@/lib/catalog/cart-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { formatUsdWithApproxBs } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CartLineItems } from "@/components/catalog-transactional/CartLineItems";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";

interface CartSummaryPanelProps {
  storeName: string;
  whatsappPhone?: string | null;
  onClose: () => void;
  onCheckout: () => void;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  /**
   * Demo o tienda en modo direct_whatsapp: el CTA abre wa.me
   * con el resumen del carrito, sin formulario de checkout.
   */
  checkoutViaWhatsApp?: boolean;
  whatsappCtaLabel?: string;
  whatsappHint?: string;
}

export function CartSummaryPanel({
  storeName,
  whatsappPhone,
  onClose,
  onCheckout,
  exchangeRate = null,
  showBsConversion = false,
  checkoutViaWhatsApp = false,
  whatsappCtaLabel = "Pedir por WhatsApp",
  whatsappHint = "Tu pedido se envía por WhatsApp con el resumen del carrito.",
}: CartSummaryPanelProps) {
  const { items, subtotalUsd, updateQuantity, removeItem } = useCart();
  const { mode, selectedLocation } = useCatalogFulfillment();
  const { accountsEnabled } = useCustomerAccountMode();

  function handleWhatsAppInquiry() {
    const phone = whatsappPhone?.trim();
    if (!phone || items.length === 0) return;

    const message = buildCartWhatsAppMessage({
      storeName,
      items,
      subtotalUsd,
      fulfillmentMode: mode,
      locationName: selectedLocation?.name ?? null,
      locationAddress: selectedLocation?.address ?? null,
    });

    const url = buildWhatsAppOrderUrl(phone, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handleCheckout() {
    if (checkoutViaWhatsApp) {
      handleWhatsAppInquiry();
      return;
    }
    onCheckout();
  }

  const whatsappReady = Boolean(whatsappPhone?.trim()) && items.length > 0;

  return (
    <div className="txn-checkout txn-cart-summary">
      <header className="txn-checkout-header">
        <div>
          <h2 className="txn-checkout-title">Tu carrito</h2>
          <p className="txn-checkout-subtitle">{storeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="txn-icon-btn"
          aria-label="Cerrar resumen del carrito"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="txn-checkout-empty">
          <ShoppingBag className="h-8 w-8 text-zinc-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Tu carrito está vacío
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Explora el catálogo y agrega lo que necesites.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="txn-submit-btn mt-6 max-w-xs"
          >
            Explorar catálogo
          </button>
        </div>
      ) : (
        <>
          <div className="txn-checkout-scroll">
            <CartLineItems
              items={items}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              exchangeRate={exchangeRate}
              showBsConversion={showBsConversion}
            />
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            <div className="txn-checkout-total !border-0 !px-0 !py-0">
              <span>Subtotal</span>
              <strong className="text-right tabular-nums">
                {formatUsdWithApproxBs(
                  subtotalUsd,
                  exchangeRate,
                  showBsConversion,
                )}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="txn-submit-btn txn-cart-summary-checkout-btn"
              disabled={checkoutViaWhatsApp && !whatsappReady}
            >
              {checkoutViaWhatsApp ? whatsappCtaLabel : "Completar pedido"}
            </button>

            <p className="txn-checkout-hint text-center">
              {checkoutViaWhatsApp
                ? whatsappHint
                : accountsEnabled
                  ? "Compra sin cuenta · Solo nombre y teléfono al pagar. El registro es opcional."
                  : "Compra como invitado · Solo nombre y teléfono al pagar."}
            </p>

            {whatsappReady && !checkoutViaWhatsApp ? (
              <button
                type="button"
                onClick={handleWhatsAppInquiry}
                className="txn-whatsapp-outline-btn"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Consultar por WhatsApp
              </button>
            ) : null}
          </footer>
        </>
      )}
    </div>
  );
}
