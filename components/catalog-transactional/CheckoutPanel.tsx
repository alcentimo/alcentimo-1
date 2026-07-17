"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { CheckoutStepper, type CheckoutStep } from "@/components/catalog/CheckoutStepper";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentCheckoutDetails } from "@/components/payments/PaymentCheckoutDetails";
import { cartItemKey } from "@/lib/catalog/cart-types";
import { formatUsd } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { loadCustomerCheckoutContext } from "@/lib/customers/checkout-actions";
import { submitTransactionalOrder } from "@/lib/orders/actions";
import type { SubmitOrderLineInput } from "@/lib/orders/types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { PaymentMethodKey } from "@/lib/store-settings/types";

interface CheckoutPanelProps {
  storeSlug: string;
  storeName: string;
  purchaseInfo: PublicPurchaseInfo;
  whatsappConfigured: boolean;
  onClose: () => void;
}

interface CustomerCheckoutProfile {
  displayName: string;
  phone: string;
}

function pickDefaultPaymentKey(
  payments: PublicPurchaseInfo["payments"],
): string {
  const pagoMovil = payments.find((payment) => payment.key === "pagoMovil");
  return pagoMovil?.key ?? payments[0]?.key ?? "";
}

export function CheckoutPanel({
  storeSlug,
  storeName,
  purchaseInfo,
  whatsappConfigured,
  onClose,
}: CheckoutPanelProps) {
  const { items, subtotalUsd, updateQuantity, removeItem, clearCart } =
    useCart();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerCheckoutProfile | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (purchaseInfo.shipping.length === 1) {
      setSelectedShipping(purchaseInfo.shipping[0].key);
    }
    setSelectedPayment(pickDefaultPaymentKey(purchaseInfo.payments));
  }, [purchaseInfo.payments, purchaseInfo.shipping]);

  useEffect(() => {
    let cancelled = false;

    void loadCustomerCheckoutContext(storeSlug).then((context) => {
      if (cancelled) return;

      const name = context.displayName?.trim() ?? "";
      const phone = context.phone?.trim() ?? "";

      if (context.isCustomer && name.length >= 2 && phone.length >= 10) {
        setCustomerProfile({ displayName: name, phone });
        setCustomerName(name);
        setCustomerPhone(phone);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  const selectedPaymentDetails = useMemo(() => {
    if (!selectedPayment) return null;
    return (
      purchaseInfo.payments.find((payment) => payment.key === selectedPayment) ??
      null
    );
  }, [purchaseInfo.payments, selectedPayment]);

  const shippingLabel =
    purchaseInfo.shipping.find((option) => option.key === selectedShipping)
      ?.label ?? "";
  const paymentLabel =
    purchaseInfo.payments.find((payment) => payment.key === selectedPayment)
      ?.label ?? "";

  const orderLines = useMemo<SubmitOrderLineInput[]>(
    () =>
      items.map((item) => ({
        productId: item.product.product_id,
        variantId: item.variantId,
        productName: item.product.product_name,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceUsd: item.unitPriceUsd,
      })),
    [items],
  );

  const canProceedStep1 =
    items.length > 0 &&
    (purchaseInfo.shipping.length === 0 || Boolean(selectedShipping));

  const hasCustomerData = customerProfile
    ? true
    : customerName.trim().length >= 2 && customerPhone.trim().length >= 10;

  const canSubmitStep2 =
    items.length > 0 &&
    hasCustomerData &&
    Boolean(proofFile) &&
    (purchaseInfo.shipping.length === 0 || Boolean(selectedShipping)) &&
    (purchaseInfo.payments.length === 0 || Boolean(selectedPayment)) &&
    !pending;

  function handleFooterAction() {
    setError(null);

    if (checkoutStep === 1) {
      if (!canProceedStep1) {
        setError("Selecciona un método de envío para continuar.");
        return;
      }
      setCheckoutStep(2);
      return;
    }

    if (!proofFile) {
      setError("Adjunta el comprobante de pago.");
      return;
    }

    if (purchaseInfo.payments.length > 0 && !selectedPayment) {
      setError("Selecciona un método de pago.");
      return;
    }

    if (!hasCustomerData) {
      setError("Indica tu nombre y teléfono para continuar.");
      return;
    }

    const formData = new FormData();
    formData.set("storeSlug", storeSlug);
    formData.set(
      "customerName",
      customerProfile?.displayName ?? customerName.trim(),
    );
    formData.set(
      "customerPhone",
      customerProfile?.phone ?? customerPhone.trim(),
    );
    formData.set("items", JSON.stringify(orderLines));
    formData.set("paymentProof", proofFile);
    if (selectedShipping) formData.set("shippingMethod", selectedShipping);
    if (selectedPayment) formData.set("paymentMethod", selectedPayment);

    startTransition(async () => {
      const result = await submitTransactionalOrder(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      clearCart();
      setCheckoutStep(1);
      setCustomerProfile(null);
      setCustomerName("");
      setCustomerPhone("");
      onClose();

      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      } else if (!whatsappConfigured) {
        setError(
          "Pedido guardado. La tienda aún no configuró WhatsApp en Configuración de Tienda.",
        );
      }
    });
  }

  return (
    <div className="txn-checkout">
      <header className="txn-checkout-header">
        <div>
          <h2 className="txn-checkout-title">Tu pedido</h2>
          <p className="txn-checkout-subtitle">{storeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="txn-icon-btn"
          aria-label="Cerrar carrito"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="txn-checkout-empty">
          <ShoppingBag className="h-8 w-8 text-zinc-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-zinc-500">
            Añade productos del catálogo para empezar.
          </p>
        </div>
      ) : (
        <>
          <CheckoutStepper
            step={checkoutStep}
            step1Label="Productos y envío"
            step2Label="Pago y datos"
          />

          <div className="txn-checkout-scroll">
            {checkoutStep === 1 ? (
              <>
                <ul className="txn-checkout-items">
                  {items.map((item) => {
                    const key = cartItemKey(
                      item.product.product_id,
                      item.variantId,
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

                {purchaseInfo.shipping.length > 0 && (
                  <div className="txn-checkout-options">
                    <div className="txn-checkout-section">
                      <p className="txn-checkout-section-title">
                        Opciones de envío
                      </p>
                      <div className="txn-checkout-method-grid">
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
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="txn-checkout-options">
                  {purchaseInfo.payments.length > 0 && (
                    <div className="txn-checkout-section">
                      <p className="txn-checkout-section-title">Método de pago</p>
                      <div className="txn-checkout-method-grid">
                        {purchaseInfo.payments.map((payment) => (
                          <PaymentMethodCard
                            key={payment.key}
                            methodKey={payment.key as PaymentMethodKey}
                            selectable
                            selected={selectedPayment === payment.key}
                            onSelect={() => setSelectedPayment(payment.key)}
                          />
                        ))}
                      </div>
                      {selectedPaymentDetails && (
                        <PaymentCheckoutDetails
                          methodKey={selectedPaymentDetails.key}
                          fields={selectedPaymentDetails.fields}
                        />
                      )}
                    </div>
                  )}
                </div>

                {customerProfile ? (
                  <div className="txn-checkout-customer-card">
                    <p className="txn-checkout-section-title">Tus datos</p>
                    <dl className="txn-checkout-customer-dl">
                      <div>
                        <dt>Nombre</dt>
                        <dd>{customerProfile.displayName}</dd>
                      </div>
                      <div>
                        <dt>Teléfono</dt>
                        <dd>{customerProfile.phone}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/c/${storeSlug}/cuenta`}
                      className="txn-checkout-customer-link"
                    >
                      Editar en Mi cuenta
                    </Link>
                  </div>
                ) : (
                  <div className="txn-checkout-form">
                    <label className="txn-field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="Tu nombre completo"
                        className="txn-input"
                      />
                    </label>

                    <label className="txn-field">
                      <span>Teléfono / WhatsApp</span>
                      <input
                        type="tel"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        minLength={10}
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                        placeholder="Ej: 0414-1234567"
                        className="txn-input"
                      />
                    </label>
                  </div>
                )}

                <div className="txn-checkout-form">
                  <label className="txn-field">
                    <span>Comprobante de pago</span>
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) =>
                        setProofFile(event.target.files?.[0] ?? null)
                      }
                      className="txn-file-input"
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            {checkoutStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCheckoutStep(1);
                }}
                className="checkout-footer-back"
              >
                ← Volver a productos y envío
              </button>
            )}

            <div className="txn-checkout-total !border-0 !px-0 !py-0">
              <span>{checkoutStep === 1 ? "Subtotal" : "Total"}</span>
              <strong>{formatUsd(subtotalUsd)}</strong>
            </div>

            {error && (
              <p className="txn-checkout-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleFooterAction}
              disabled={checkoutStep === 1 ? !canProceedStep1 : !canSubmitStep2}
              className="txn-submit-btn"
            >
              {pending
                ? "Procesando…"
                : checkoutStep === 1
                  ? "Continuar"
                  : "Finalizar pedido por WhatsApp"}
            </button>

            {checkoutStep === 2 && !customerProfile && (
              <p className="txn-checkout-hint">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href={`/register?store=${encodeURIComponent(storeSlug)}&next=${encodeURIComponent(`/c/${storeSlug}?checkout=1`)}`}
                  className="link-brand"
                >
                  Inicia sesión
                </Link>{" "}
                para autocompletar tus datos la próxima vez.
              </p>
            )}

            {checkoutStep === 2 && !whatsappConfigured && (
              <p className="txn-checkout-hint">
                Si WhatsApp no está configurado, el pedido se guardará igual en
                el panel del dueño.
              </p>
            )}

            {checkoutStep === 2 && (shippingLabel || paymentLabel) && (
              <p className="txn-checkout-hint">
                {shippingLabel ? `Envío: ${shippingLabel}` : null}
                {shippingLabel && paymentLabel ? " · " : null}
                {paymentLabel ? `Pago: ${paymentLabel}` : null}
              </p>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
