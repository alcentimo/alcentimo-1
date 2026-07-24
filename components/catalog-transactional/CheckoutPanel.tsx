"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { CheckoutStepper, type CheckoutStep } from "@/components/catalog/CheckoutStepper";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { ShippingBranchPicker } from "@/components/shipping/ShippingBranchPicker";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentCheckoutDetails } from "@/components/payments/PaymentCheckoutDetails";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { CheckoutSuccessScreen } from "@/components/catalog-transactional/CheckoutSuccessScreen";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { cartItemKey } from "@/lib/catalog/cart-types";
import { formatUsd, formatExchangeRate } from "@/lib/format";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { loadCustomerCheckoutContext } from "@/lib/customers/checkout-actions";
import { submitTransactionalOrder } from "@/lib/orders/actions";
import type { SubmitOrderLineInput } from "@/lib/orders/types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import { formatCarrierBranchAddress, getCarrierBranchById } from "@/lib/shipping/carrier-branches";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import {
  redeemCustomerPromotionCode,
  validateCustomerPromotionCode,
} from "@/lib/promotions/actions";
import { calculatePromotionDiscountUsd } from "@/lib/promotions/discount";
import type { AppliedPromotion } from "@/lib/promotions/types";
import {
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import type { CatalogFulfillmentMode } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

interface CheckoutPanelProps {
  storeSlug: string;
  storeName: string;
  purchaseInfo: PublicPurchaseInfo;
  whatsappConfigured: boolean;
  exchangeRate?: number | null;
  showOfficialRate?: boolean;
  showBsConversion?: boolean;
  onClose: () => void;
  fulfillmentMode?: CatalogFulfillmentMode;
  locationId?: string | null;
}

interface CustomerCheckoutProfile {
  displayName: string;
  phone: string;
  deliveryAddress?: string | null;
  preferredShippingMethod?: string | null;
  preferredShippingBranchCode?: string | null;
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
  exchangeRate = null,
  showOfficialRate = false,
  showBsConversion = false,
  onClose,
  fulfillmentMode = "delivery",
  locationId = null,
}: CheckoutPanelProps) {
  const { items, subtotalUsd, updateQuantity, removeItem, clearCart } =
    useCart();
  const { autoApply } = usePromotionContext();
  const { mode: fulfillmentModeFromContext, multiLocation } = useCatalogFulfillment();
  const activeFulfillmentMode = fulfillmentMode ?? fulfillmentModeFromContext;
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerCheckoutProfile | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [shippingBranchCode, setShippingBranchCode] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{
    orderId: string;
    totalUsd: number;
    whatsappOpened: boolean;
    wasGuest: boolean;
    customerName: string;
    customerPhone: string;
  } | null>(null);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [promotionInput, setPromotionInput] = useState("");
  const [appliedPromotion, setAppliedPromotion] =
    useState<AppliedPromotion | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionPending, startPromotionTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (purchaseInfo.shipping.length === 1) {
      setSelectedShipping(purchaseInfo.shipping[0].key);
    }
    setSelectedPayment(pickDefaultPaymentKey(purchaseInfo.payments));
  }, [purchaseInfo.payments, purchaseInfo.shipping]);

  const isNationalCarrierSelected = isNationalCarrierKey(selectedShipping);
  const isLocalDeliverySelected = selectedShipping === "delivery";
  const isPickupSelected = selectedShipping === "pickup";

  useEffect(() => {
    if (!isNationalCarrierSelected) {
      setShippingBranchCode(null);
    }
  }, [isNationalCarrierSelected, selectedShipping]);

  useEffect(() => {
    if (selectedShipping || purchaseInfo.shipping.length === 0) return;

    if (fulfillmentMode === "pickup") {
      const pickup = purchaseInfo.shipping.find((method) => method.key === "pickup");
      if (pickup) setSelectedShipping("pickup");
      return;
    }

    const delivery = purchaseInfo.shipping.find((method) => method.key === "delivery");
    if (delivery) setSelectedShipping("delivery");
  }, [fulfillmentMode, purchaseInfo.shipping, selectedShipping]);

  useEffect(() => {
    let cancelled = false;

    void loadCustomerCheckoutContext(storeSlug).then((context) => {
      if (cancelled) return;

      const name = context.displayName?.trim() ?? "";
      const phone = context.phone?.trim() ?? "";

      if (context.isCustomer && name.length >= 2 && phone.length >= 10) {
        setCustomerProfile({
          displayName: name,
          phone,
          deliveryAddress: context.deliveryAddress,
          preferredShippingMethod: context.preferredShippingMethod,
          preferredShippingBranchCode: context.preferredShippingBranchCode,
        });
        setCustomerName(name);
        setCustomerPhone(phone);
        if (context.deliveryAddress) {
          setDeliveryAddress(context.deliveryAddress);
        }

        const preferredMethod = context.preferredShippingMethod;
        if (
          preferredMethod &&
          purchaseInfo.shipping.some((option) => option.key === preferredMethod)
        ) {
          setSelectedShipping(preferredMethod);
          if (
            isNationalCarrierKey(preferredMethod) &&
            context.preferredShippingBranchCode
          ) {
            setShippingBranchCode(context.preferredShippingBranchCode);
          }
        } else if (fulfillmentMode === "pickup") {
          const pickup = purchaseInfo.shipping.find((method) => method.key === "pickup");
          if (pickup) setSelectedShipping("pickup");
        } else if (fulfillmentMode === "delivery") {
          const delivery = purchaseInfo.shipping.find(
            (method) => method.key === "delivery",
          );
          if (delivery) setSelectedShipping("delivery");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeSlug, fulfillmentMode, purchaseInfo.shipping]);

  useEffect(() => {
    if (!customerProfile || !autoApply) return;
    setAppliedPromotion(autoApply);
    setPromotionInput(autoApply.code);
  }, [customerProfile, autoApply]);

  const discountUsd = useMemo(() => {
    if (!appliedPromotion) return 0;
    return calculatePromotionDiscountUsd(
      subtotalUsd,
      appliedPromotion.discountPercent,
    );
  }, [appliedPromotion, subtotalUsd]);

  const totalUsd = Math.max(0, subtotalUsd - discountUsd);
  const totalLocal =
    showBsConversion && exchangeRate && exchangeRate > 0
      ? totalUsd * exchangeRate
      : null;

  const submitButtonLabel = pending
    ? "Procesando…"
    : checkoutStep === 1
      ? "Continuar al pago"
      : whatsappConfigured
        ? "Confirmar pedido y enviar por WhatsApp"
        : "Confirmar pedido";

  function handleApplyPromotion() {
    setPromotionError(null);
    startPromotionTransition(async () => {
      const result = await validateCustomerPromotionCode(
        storeSlug,
        promotionInput,
      );

      if (result.error || !result.code || !result.discountPercent) {
        setAppliedPromotion(null);
        setPromotionError(result.error ?? "Promoción no válida.");
        return;
      }

      setAppliedPromotion({
        code: result.code,
        name: result.name ?? result.code,
        discountPercent: result.discountPercent,
      });
      setPromotionInput(result.code);
    });
  }

  function handleRemovePromotion() {
    setAppliedPromotion(null);
    setPromotionInput("");
    setPromotionError(null);
  }

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
    (purchaseInfo.shipping.length === 0 || Boolean(selectedShipping)) &&
    (!isLocalDeliverySelected || deliveryAddress.trim().length >= 8) &&
    (!isNationalCarrierSelected || Boolean(shippingBranchCode));

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
        if (isLocalDeliverySelected && deliveryAddress.trim().length < 8) {
          setError("Indica tu dirección de entrega (mínimo 8 caracteres).");
        } else if (isNationalCarrierSelected && !shippingBranchCode) {
          setError("Selecciona la sucursal de destino de la agencia.");
        } else {
          setError("Selecciona un método de envío para continuar.");
        }
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
    if (appliedPromotion) {
      formData.set("promotionCode", appliedPromotion.code);
    }
    if (selectedShipping) formData.set("shippingMethod", selectedShipping);
    if (selectedPayment) formData.set("paymentMethod", selectedPayment);

    if (isPickupSelected) {
      formData.set("fulfillmentType", "pickup");
    } else if (isLocalDeliverySelected) {
      formData.set("fulfillmentType", "delivery");
      if (deliveryAddress.trim()) {
        formData.set("deliveryAddress", deliveryAddress.trim());
      }
    } else if (isNationalCarrierSelected) {
      formData.set("fulfillmentType", "shipping");
      if (shippingBranchCode) {
        formData.set("shippingBranchCode", shippingBranchCode);
        const branch = getCarrierBranchById(shippingBranchCode);
        if (branch) {
          formData.set("shippingBranchName", branch.name);
          formData.set("shippingBranchAddress", formatCarrierBranchAddress(branch));
        }
      }
    } else {
      formData.set("fulfillmentType", activeFulfillmentMode);
    }

    if (locationId) formData.set("locationId", locationId);

    startTransition(async () => {
      const result = await submitTransactionalOrder(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      const openedWhatsApp = Boolean(result.whatsappUrl);
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      const wasGuest = !customerProfile;
      const submittedName = customerProfile?.displayName ?? customerName.trim();
      const submittedPhone = customerProfile?.phone ?? customerPhone.trim();

      clearCart();
      setCheckoutStep(1);
      setCustomerProfile(null);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setShippingBranchCode(null);
      setAppliedPromotion(null);
      setPromotionInput("");
      setPromotionError(null);
      setProofFile(null);

      if (result.orderId) {
        setSuccessOrder({
          orderId: result.orderId,
          totalUsd,
          whatsappOpened: openedWhatsApp,
          wasGuest,
          customerName: submittedName,
          customerPhone: submittedPhone,
        });
        return;
      }

      onClose();
    });
  }

  if (successOrder) {
    return (
      <div className="txn-checkout">
        <CheckoutSuccessScreen
          storeSlug={storeSlug}
          orderId={successOrder.orderId}
          totalUsd={successOrder.totalUsd}
          whatsappOpened={successOrder.whatsappOpened}
          wasGuest={successOrder.wasGuest}
          customerName={successOrder.customerName}
          customerPhone={successOrder.customerPhone}
          onClose={() => {
            setSuccessOrder(null);
            onClose();
          }}
        />
      </div>
    );
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
            step1Label="Carrito y envío"
            step2Label="Pago y contacto"
          />

          <div className="txn-checkout-scroll">
            {checkoutStep === 1 ? (
              <>
                {multiLocation ? (
                  <div className="mb-4">
                    <CatalogLocationPicker />
                  </div>
                ) : null}

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

                {isNationalCarrierSelected ? (
                  <div className="txn-checkout-form">
                    <ShippingBranchPicker
                      carrier={selectedShipping as ShippingCarrierKey}
                      value={shippingBranchCode}
                      onChange={(branch) => setShippingBranchCode(branch?.id ?? null)}
                    />
                    <p className="text-[11px] text-zinc-500">
                      Usaremos esta sucursal para coordinar el envío de este pedido.
                    </p>
                  </div>
                ) : null}

                {isLocalDeliverySelected ? (
                  <div className="txn-checkout-form">
                    <label className="txn-field">
                      <span>Dirección de entrega</span>
                      <textarea
                        required
                        minLength={8}
                        rows={3}
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                        placeholder="Calle, edificio, referencia…"
                        className="txn-input min-h-[5rem] resize-y"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      La usaremos para entregar este pedido.
                    </p>
                  </div>
                ) : null}

                {(customerProfile || autoApply) && (
                  <div className="txn-checkout-promo">
                    <p className="txn-checkout-section-title">
                      Código de promoción
                    </p>
                    {appliedPromotion ? (
                      <div className="txn-checkout-promo-applied">
                        <div>
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">
                            {appliedPromotion.name}
                          </p>
                          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                            {appliedPromotion.code} · -{appliedPromotion.discountPercent}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromotion}
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promotionInput}
                          onChange={(event) => setPromotionInput(event.target.value)}
                          placeholder="Ej: CLIENTE10"
                          className="txn-input flex-1 uppercase"
                          disabled={promotionPending}
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromotion}
                          disabled={!promotionInput.trim() || promotionPending}
                          className="txn-promo-apply-btn"
                        >
                          {promotionPending ? "…" : "Aplicar"}
                        </button>
                      </div>
                    )}
                    {promotionError ? (
                      <p className="mt-1 text-xs text-red-600">{promotionError}</p>
                    ) : null}
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
                      href={getStoreCustomerAccountPath(storeSlug, "cuenta")}
                      className="txn-checkout-customer-link"
                    >
                      Editar en Mi cuenta
                    </Link>
                  </div>
                ) : (
                  <div className="txn-checkout-form">
                    <p className="txn-checkout-section-title">Tus datos de contacto</p>
                    <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Compra sin registro: solo nombre y teléfono para coordinar tu
                      pedido. Crear una cuenta es opcional al finalizar.
                    </p>
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
              <span>{checkoutStep === 1 ? "Subtotal" : "Subtotal"}</span>
              <strong>{formatUsd(subtotalUsd)}</strong>
            </div>
            {discountUsd > 0 && appliedPromotion ? (
              <div className="txn-checkout-total txn-checkout-total-discount !border-0 !px-0 !py-0">
                <span>Descuento ({appliedPromotion.code})</span>
                <strong>-{formatUsd(discountUsd)}</strong>
              </div>
            ) : null}
            {checkoutStep === 2 || discountUsd > 0 ? (
              <div className="txn-checkout-total !border-0 !px-0 !py-0">
                <span>Total</span>
                <strong>{formatUsd(totalUsd)}</strong>
              </div>
            ) : null}

            {checkoutStep === 2 && showOfficialRate && exchangeRate ? (
              <div className="txn-checkout-rate-box">
                <p>
                  Tasa BCV:{" "}
                  <strong>Bs. {formatExchangeRate(exchangeRate)} / USD</strong>
                </p>
                {totalLocal != null ? (
                  <p className="mt-1">
                    Equivalente:{" "}
                    <strong>
                      {formatCountryCurrency(totalLocal, "VES", "es-VE")}
                    </strong>
                  </p>
                ) : null}
              </div>
            ) : null}

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
              {submitButtonLabel}
            </button>

            {checkoutStep === 2 && (
              <p className="txn-checkout-hint">
                {whatsappConfigured
                  ? "Tu pedido se guarda en la tienda y se abre WhatsApp para confirmar el pago."
                  : "Tu pedido quedará registrado en el panel de la tienda."}
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
