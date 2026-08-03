"use client";

import { MessageCircle, ShoppingBag, X } from "lucide-react";
import { buildCartWhatsAppMessage } from "@/lib/catalog/cart-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { formatUsd } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CartLineItems } from "@/components/catalog-transactional/CartLineItems";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";

interface CartSummaryPanelProps {
  storeName: string;
  whatsappPhone?: string | null;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartSummaryPanel({
  storeName,
  whatsappPhone,
  onClose,
  onCheckout,
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
          <p className="mt-3 text-sm text-zinc-500">
            Aún no has añadido productos.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Explora el catálogo y agrega lo que necesites.
          </p>
        </div>
      ) : (
        <>
          <div className="txn-checkout-scroll">
            <CartLineItems
              items={items}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
            />
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            <div className="txn-checkout-total !border-0 !px-0 !py-0">
              <span>Subtotal</span>
              <strong>{formatUsd(subtotalUsd)}</strong>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="txn-submit-btn txn-cart-summary-checkout-btn"
            >
              Finalizar pedido
            </button>

            <p className="txn-checkout-hint text-center">
              {accountsEnabled
                ? "Compra sin cuenta · Solo nombre y teléfono al pagar. El registro es opcional."
                : "Compra como invitado · Solo nombre y teléfono al pagar."}
            </p>

            {whatsappReady ? (
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
