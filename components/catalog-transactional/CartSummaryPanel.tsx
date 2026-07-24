"use client";

import Image from "next/image";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cartItemKey } from "@/lib/catalog/cart-types";
import { buildCartWhatsAppMessage } from "@/lib/catalog/cart-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { formatUsd } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

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
            <ul className="txn-checkout-items">
              {items.map((item) => {
                const key = cartItemKey(
                  item.product.product_id,
                  item.variantId,
                  item.modifiers,
                );
                return (
                  <li key={key} className="txn-checkout-item">
                    <div className="txn-checkout-item-thumb">
                      {item.product.thumb_url ? (
                        <Image
                          src={item.product.thumb_url}
                          alt={item.product.product_name}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-400">
                          {item.product.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="txn-checkout-item-body">
                      <div className="txn-checkout-item-top">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                            {item.product.product_name}
                          </p>
                          {item.variantName !== "Estándar" && (
                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              {item.variantName}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="txn-remove-btn"
                          onClick={() =>
                            removeItem(
                              item.product.product_id,
                              item.variantId,
                              item.modifiers,
                            )
                          }
                          aria-label={`Eliminar ${item.product.product_name} del carrito`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                        {formatUsd(item.unitPriceUsd * item.quantity)}
                      </p>

                      <div className="txn-checkout-item-qty">
                        <button
                          type="button"
                          className="txn-qty-btn"
                          onClick={() =>
                            updateQuantity(
                              item.product.product_id,
                              item.variantId,
                              item.quantity - 1,
                              item.modifiers,
                            )
                          }
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="txn-qty-btn"
                          onClick={() =>
                            updateQuantity(
                              item.product.product_id,
                              item.variantId,
                              item.quantity + 1,
                              item.modifiers,
                            )
                          }
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
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
