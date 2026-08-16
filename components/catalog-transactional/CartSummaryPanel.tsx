"use client";

import { useMemo } from "react";
import { MessageCircle, ShoppingBag, X } from "lucide-react";
import { buildCartWhatsAppMessage } from "@/lib/catalog/cart-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { formatUsd, formatUsdWithApproxBs } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CartLineItems } from "@/components/catalog-transactional/CartLineItems";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import { calculatePromotionDiscountUsd } from "@/lib/promotions/discount";

interface CartSummaryPanelProps {
  storeName: string;
  whatsappPhone?: string | null;
  onClose: () => void;
  onCheckout: () => void;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  /** Muestra el CTA que abre el checkout paso a paso. */
  showFullCheckoutCta?: boolean;
  /** Muestra el CTA que abre wa.me con el carrito. */
  showWhatsAppCta?: boolean;
  /**
   * Cuando solo hay WhatsApp (sin checkout web), el botón verde es el principal.
   */
  whatsappAsPrimary?: boolean;
  checkoutCtaLabel?: string;
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
  showFullCheckoutCta = true,
  showWhatsAppCta = false,
  whatsappAsPrimary = false,
  checkoutCtaLabel = "Finalizar pedido",
  whatsappCtaLabel = "Pedir por WhatsApp",
  whatsappHint = "Tu pedido se envía por WhatsApp con el resumen del carrito.",
}: CartSummaryPanelProps) {
  const { items, subtotalUsd, updateQuantity, removeItem } = useCart();
  const { mode, selectedLocation } = useCatalogFulfillment();
  const { accountsEnabled } = useCustomerAccountMode();
  const { autoApply } = usePromotionContext();
  const customerSession = useCustomerSessionOptional();
  const shellNav = useCatalogShellNavigationOptional();

  const isLoggedCustomer = Boolean(
    customerSession?.isAuthenticated && customerSession?.isCustomer,
  );
  const appliedPromotion =
    isLoggedCustomer && autoApply ? autoApply : null;

  const discountUsd = useMemo(() => {
    if (!appliedPromotion) return 0;
    return calculatePromotionDiscountUsd(
      subtotalUsd,
      appliedPromotion.discountPercent,
    );
  }, [appliedPromotion, subtotalUsd]);

  const merchandiseUsd = Math.max(0, subtotalUsd - discountUsd);

  function handleWhatsAppOrder() {
    const phone = whatsappPhone?.trim();
    if (!phone || items.length === 0) return;

    const message = buildCartWhatsAppMessage({
      storeName,
      items,
      subtotalUsd: merchandiseUsd,
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
  const whatsappPrimary = showWhatsAppCta && (whatsappAsPrimary || !showFullCheckoutCta);

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

            {appliedPromotion && discountUsd > 0 ? (
              <div className="txn-checkout-promo mx-4 mb-3 mt-2 sm:mx-6">
                <div className="txn-checkout-promo-applied">
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">
                      {appliedPromotion.name}
                    </p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      {appliedPromotion.code} · -{appliedPromotion.discountPercent}% ·
                      aplicado por ser cliente
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Aplicado
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            {appliedPromotion && discountUsd > 0 ? (
              <div className="txn-checkout-order-meta !px-0 !pt-0">
                <div className="txn-checkout-total !border-0 !px-0 !py-0">
                  <span>Subtotal</span>
                  <strong className="text-right tabular-nums">
                    {formatUsd(subtotalUsd)}
                  </strong>
                </div>
                <div className="txn-checkout-total txn-checkout-total-discount !border-0 !px-0 !py-0">
                  <span>
                    Descuento ({appliedPromotion.code} · -
                    {appliedPromotion.discountPercent}%)
                  </span>
                  <strong className="tabular-nums">
                    -{formatUsd(discountUsd)}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="txn-checkout-total !border-0 !px-0 !py-0">
              <span>{discountUsd > 0 ? "Total" : "Subtotal"}</span>
              <strong className="text-right tabular-nums">
                {formatUsdWithApproxBs(
                  merchandiseUsd,
                  exchangeRate,
                  showBsConversion,
                )}
              </strong>
            </div>

            {showFullCheckoutCta ? (
              <button
                type="button"
                onClick={onCheckout}
                className="txn-submit-btn txn-cart-summary-checkout-btn"
              >
                {checkoutCtaLabel}
              </button>
            ) : null}

            {showWhatsAppCta ? (
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                disabled={!whatsappReady}
                className={
                  whatsappPrimary
                    ? "txn-whatsapp-primary-btn flex w-full touch-manipulation items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    : "txn-whatsapp-outline-btn !mt-2"
                }
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {whatsappCtaLabel}
              </button>
            ) : null}

            {showWhatsAppCta && !whatsappPhone?.trim() ? (
              <p className="txn-checkout-error text-center" role="status">
                La tienda aún no configuró un WhatsApp para recibir pedidos.
              </p>
            ) : null}

            <p className="txn-checkout-hint text-center">
              {whatsappPrimary
                ? whatsappHint
                : showFullCheckoutCta && showWhatsAppCta
                  ? whatsappHint
                  : accountsEnabled
                    ? discountUsd > 0
                      ? "Descuento de cliente aplicado · Completa el pedido para confirmarlo."
                      : "Compra sin cuenta · Solo nombre y teléfono al pagar. El registro es opcional."
                    : "Compra como invitado · Solo nombre y teléfono al pagar."}
            </p>

            {accountsEnabled && !isLoggedCustomer ? (
              <p className="mt-2 text-center text-xs text-zinc-500">
                <button
                  type="button"
                  className="font-semibold text-[var(--mo-emerald,var(--txn-primary,#0e5c42))] underline-offset-2 hover:underline"
                  onClick={() => shellNav?.openRegister("login")}
                >
                  Entrar
                </button>
                {" · "}
                <button
                  type="button"
                  className="font-semibold text-[var(--mo-emerald,var(--txn-primary,#0e5c42))] underline-offset-2 hover:underline"
                  onClick={() => shellNav?.openRegister("register")}
                >
                  Crea tu cuenta
                </button>
                {" para guardar tus pedidos"}
              </p>
            ) : null}
          </footer>
        </>
      )}
    </div>
  );
}
