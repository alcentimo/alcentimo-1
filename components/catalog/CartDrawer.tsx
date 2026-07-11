"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { cartItemKey, type CartItem } from "@/lib/catalog/cart-types";
import { formatUsd, formatVes } from "@/lib/format";
import {
  buildOrderWhatsAppMessage,
  buildWhatsAppOrderUrl,
} from "@/lib/catalog/whatsapp-order";
import { processCatalogOrder } from "@/lib/catalog/order-actions";
import { redeemCouponCode, validateCouponCode } from "@/lib/coupons/actions";
import {
  calculateCartCouponDiscount,
  getEligibleCartProductIds,
  isCartItemEligible,
} from "@/lib/coupons/discount";
import type { AppliedCoupon } from "@/lib/coupons/types";

interface CartDrawerProps {
  open: boolean;
  storeSlug: string;
  storeName: string;
  purchaseInfo: PublicPurchaseInfo;
  items: CartItem[];
  onClose: () => void;
  onRemove: (productId: string, variantId: string) => void;
  onUpdateQuantity: (productId: string, variantId: string, quantity: number) => void;
  onOrderComplete: (items: CartItem[]) => void;
}

const INSTALLMENTS_KEY = "__installments__";

function buildPaymentOptions(purchaseInfo: PublicPurchaseInfo) {
  const options: { value: string; label: string }[] = purchaseInfo.payments.map(
    (payment) => ({
      value: payment.key,
      label: payment.label,
    }),
  );

  if (purchaseInfo.installments) {
    options.push({
      value: INSTALLMENTS_KEY,
      label: "Venta a cuotas",
    });
  }

  return options;
}

function couponSummaryLabel(coupon: AppliedCoupon): string {
  if (coupon.discountType === "fixed") {
    return formatUsd(coupon.discountFixedUsd ?? 0);
  }
  return `${coupon.discountPercent ?? 0}%`;
}

export function CartDrawer({
  open,
  storeSlug,
  storeName,
  purchaseInfo,
  items,
  onClose,
  onRemove,
  onUpdateQuantity,
  onOrderComplete,
}: CartDrawerProps) {
  const [selectedShipping, setSelectedShipping] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, startCouponTransition] = useTransition();

  const paymentOptions = useMemo(
    () => buildPaymentOptions(purchaseInfo),
    [purchaseInfo],
  );

  const subtotalUsd = items.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0,
  );

  const subtotalVes = items.reduce(
    (sum, item) => sum + (item.unitPriceVes ?? 0) * item.quantity,
    0,
  );

  const activeCoupon = useMemo(() => {
    if (!appliedCoupon) return null;
    const eligibleProductIds = getEligibleCartProductIds(
      items.map((item) => item.product.product_id),
      appliedCoupon.isGlobal,
      appliedCoupon.productIds,
    );
    return { ...appliedCoupon, eligibleProductIds };
  }, [appliedCoupon, items]);

  const couponBreakdown = useMemo(() => {
    if (!activeCoupon) return null;
    return calculateCartCouponDiscount(items, activeCoupon);
  }, [items, activeCoupon]);

  const discountUsd = couponBreakdown?.discountUsd ?? 0;
  const discountVes = couponBreakdown?.discountVes ?? 0;
  const totalUsd = Math.max(0, subtotalUsd - discountUsd);
  const totalVes = Math.max(0, subtotalVes - discountVes);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (purchaseInfo.shipping.length === 1) {
      setSelectedShipping(purchaseInfo.shipping[0].key);
    }
    if (paymentOptions.length === 1) {
      setSelectedPayment(paymentOptions[0].value);
    }
  }, [purchaseInfo.shipping, paymentOptions, open]);

  const shippingLabel =
    purchaseInfo.shipping.find((option) => option.key === selectedShipping)
      ?.label ?? "";

  const paymentLabel =
    paymentOptions.find((option) => option.value === selectedPayment)?.label ??
    "";

  const canCheckout =
    items.length > 0 &&
    purchaseInfo.whatsappPhone.trim().length > 0 &&
    (purchaseInfo.shipping.length === 0 || selectedShipping) &&
    (paymentOptions.length === 0 || selectedPayment) &&
    !processing;

  const missingWhatsApp = items.length > 0 && !purchaseInfo.whatsappPhone.trim();

  useEffect(() => {
    if (!appliedCoupon || items.length === 0) return;
    const eligibleProductIds = getEligibleCartProductIds(
      items.map((item) => item.product.product_id),
      appliedCoupon.isGlobal,
      appliedCoupon.productIds,
    );
    if (eligibleProductIds.length === 0) {
      setAppliedCoupon(null);
      setCouponError("Este cupón no aplica a los productos de tu carrito.");
    }
  }, [appliedCoupon, items]);

  function handleApplyCoupon() {
    setCouponError(null);
    startCouponTransition(async () => {
      const cartProductIds = items.map((item) => item.product.product_id);
      const result = await validateCouponCode(storeSlug, couponInput, cartProductIds);

      const hasValidDiscount =
        result.discountType === "fixed"
          ? (result.discountFixedUsd ?? 0) > 0
          : (result.discountPercent ?? 0) > 0;

      if (result.error || !result.code || !hasValidDiscount) {
        setAppliedCoupon(null);
        setCouponError(result.error ?? "Cupón no válido.");
        return;
      }

      setAppliedCoupon({
        code: result.code,
        discountType: result.discountType ?? "percent",
        discountPercent: result.discountPercent ?? null,
        discountFixedUsd: result.discountFixedUsd ?? null,
        isGlobal: result.isGlobal ?? true,
        productIds: result.productIds ?? [],
        eligibleProductIds: result.eligibleProductIds ?? [],
      });
      setCouponInput(result.code);
    });
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handleFinalizeOrder() {
    if (!canCheckout) return;

    setOrderError(null);
    setProcessing(true);

    const orderLines = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const result = await processCatalogOrder(storeSlug, orderLines);
    if (result.error) {
      setProcessing(false);
      setOrderError(result.error);
      return;
    }

    if (appliedCoupon) {
      const redeem = await redeemCouponCode(storeSlug, appliedCoupon.code);
      if (redeem.error) {
        setProcessing(false);
        setOrderError(redeem.error);
        return;
      }
    }

    const message = buildOrderWhatsAppMessage({
      storeName,
      items,
      subtotalUsd,
      totalUsd,
      discountUsd,
      couponCode: appliedCoupon?.code,
      paymentLabel: paymentLabel || "Por confirmar",
      shippingLabel: shippingLabel || "Por confirmar",
    });

    const url = buildWhatsAppOrderUrl(purchaseInfo.whatsappPhone, message);
    if (!url) {
      setProcessing(false);
      setOrderError("Número de WhatsApp inválido.");
      return;
    }

    onOrderComplete(items);
    setAppliedCoupon(null);
    setCouponInput("");
    setProcessing(false);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div
        className={`store-cart-overlay ${open ? "store-cart-overlay-open" : ""}`}
        role="presentation"
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`store-cart-drawer ${open ? "store-cart-drawer-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        aria-hidden={!open}
      >
        <div className="store-cart-header">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Tu carrito</h2>
              <p className="text-sm text-zinc-500">
                {items.length} artículo{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="store-cart-close"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="store-cart-empty">
            <p className="text-sm font-medium text-zinc-700">Tu carrito está vacío</p>
            <p className="mt-1 text-sm text-zinc-500">
              Explora el catálogo y agrega productos.
            </p>
          </div>
        ) : (
          <>
            <ul className="store-cart-items">
              {items.map((item) => {
                const key = cartItemKey(item.product.product_id, item.variantId);
                const itemEligible =
                  activeCoupon != null &&
                  isCartItemEligible(item.product.product_id, activeCoupon);
                return (
                  <li key={key} className="store-cart-item">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {item.product.thumb_url ? (
                        <Image
                          src={item.product.thumb_url}
                          alt={item.product.product_name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-400">
                          {item.product.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {item.product.product_name}
                      </p>
                      {item.variantName !== "Estándar" && (
                        <p className="truncate text-xs text-zinc-500">{item.variantName}</p>
                      )}
                      {activeCoupon && (
                        <p
                          className={`mt-0.5 text-xs ${
                            itemEligible ? "text-teal-700" : "text-zinc-400"
                          }`}
                        >
                          {itemEligible ? "Incluido en cupón" : "Sin descuento de cupón"}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {formatUsd(item.unitPriceUsd * item.quantity)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.product_id,
                              item.variantId,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          className="store-qty-btn"
                          aria-label={`Reducir cantidad de ${item.product.product_name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-medium text-zinc-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.product_id,
                              item.variantId,
                              item.quantity + 1,
                            )
                          }
                          className="store-qty-btn"
                          aria-label={`Aumentar cantidad de ${item.product.product_name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRemove(item.product.product_id, item.variantId)
                          }
                          className="ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-900"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="store-cart-checkout">
              <div className="store-cart-checkout-section">
                <h3 className="store-cart-checkout-title">Información de compra</h3>

                <div className="store-cart-field">
                  <label htmlFor="cart-coupon" className="store-cart-label">
                    Aplicar cupón
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="cart-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Código de descuento"
                      className="store-cart-select flex-1 uppercase"
                      disabled={Boolean(appliedCoupon) || couponPending}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="store-qty-btn px-3 text-xs font-medium"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponInput.trim() || couponPending}
                        className="store-qty-btn px-3 text-xs font-medium"
                      >
                        {couponPending ? "…" : "Aplicar"}
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p className="mt-1 text-xs text-red-600">{couponError}</p>
                  )}
                  {appliedCoupon && activeCoupon && discountUsd > 0 && (
                    <p className="mt-1 text-xs text-teal-700">
                      Cupón {activeCoupon.code} aplicado ({couponSummaryLabel(activeCoupon)}
                      {activeCoupon.isGlobal
                        ? " · toda la tienda"
                        : ` · ${activeCoupon.eligibleProductIds.length} producto(s)`}
                      )
                    </p>
                  )}
                </div>

                {purchaseInfo.shipping.length > 0 && (
                  <div className="store-cart-field">
                    <p className="store-cart-label">Método de envío</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {purchaseInfo.shipping.map((option) => (
                        <ShippingMethodCard
                          key={option.key}
                          carrierKey={option.key}
                          details={option.details}
                          description={option.description}
                          estimatedTime={option.estimatedTime}
                          selectable
                          selected={selectedShipping === option.key}
                          onSelect={() => setSelectedShipping(option.key)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {paymentOptions.length > 0 && (
                  <div className="store-cart-field">
                    <label htmlFor="cart-payment" className="store-cart-label">
                      Método de pago
                    </label>
                    <select
                      id="cart-payment"
                      value={selectedPayment}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                      className="store-cart-select"
                    >
                      <option value="">Seleccionar pago…</option>
                      {paymentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="store-cart-summary space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Subtotal</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900">
                      {formatUsd(subtotalUsd)}
                    </p>
                    {subtotalVes > 0 && (
                      <p className="text-xs text-zinc-400">{formatVes(subtotalVes)}</p>
                    )}
                  </div>
                </div>

                {appliedCoupon && activeCoupon && discountUsd > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-teal-700">
                      Descuento ({couponSummaryLabel(activeCoupon)})
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-teal-700">
                        -{formatUsd(discountUsd)}
                      </p>
                      {discountVes > 0 && (
                        <p className="text-xs text-teal-600">-{formatVes(discountVes)}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
                  <span className="text-sm font-medium text-zinc-700">Total</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900">{formatUsd(totalUsd)}</p>
                    {totalVes > 0 && (
                      <p className="text-xs text-zinc-400">{formatVes(totalVes)}</p>
                    )}
                  </div>
                </div>
              </div>

              {orderError && <p className="store-cart-warning">{orderError}</p>}

              {missingWhatsApp && (
                <p className="store-cart-warning">
                  La tienda aún no configuró un WhatsApp para recibir pedidos.
                </p>
              )}

              <button
                type="button"
                onClick={handleFinalizeOrder}
                disabled={!canCheckout && !processing}
                className={
                  canCheckout || processing
                    ? "store-whatsapp-btn"
                    : "store-whatsapp-btn-disabled"
                }
              >
                {processing ? "Procesando pedido…" : "Finalizar pedido por WhatsApp"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
