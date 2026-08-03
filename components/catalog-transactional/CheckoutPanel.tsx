"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ShoppingBag, X } from "lucide-react";
import { CheckoutStepper, type CheckoutStep } from "@/components/catalog/CheckoutStepper";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { ShippingBranchPicker } from "@/components/shipping/ShippingBranchPicker";
import { DeliveryZonePicker } from "@/components/shipping/DeliveryZonePicker";
import { PickupPointPicker } from "@/components/shipping/PickupPointPicker";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentCheckoutDetails } from "@/components/payments/PaymentCheckoutDetails";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { CartLineItems } from "@/components/catalog-transactional/CartLineItems";
import { CheckoutSuccessScreen } from "@/components/catalog-transactional/CheckoutSuccessScreen";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { buildSubmitOrderLinesFromCartItems } from "@/lib/catalog/cart-lines";
import { formatUsd, formatExchangeRate } from "@/lib/format";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { loadCustomerCheckoutContext } from "@/lib/customers/checkout-actions";
import { submitTransactionalOrder } from "@/lib/orders/actions";
import type { SubmitOrderLineInput } from "@/lib/orders/types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import { paymentMethodRequiresProof } from "@/src/config/payment-methods";
import { formatCarrierBranchAddress, getCarrierBranchById } from "@/lib/shipping/carrier-branches";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";
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
import {
  CheckoutFieldGroup,
  checkoutFileInputClass,
  checkoutInputClass,
} from "@/components/catalog-transactional/CheckoutFieldFeedback";
import {
  summarizeCheckoutValidation,
  validateCheckoutStep1,
  validateCheckoutStep2,
  type CheckoutFieldKey,
} from "@/lib/catalog/checkout-validation";
import { cn } from "@/lib/cn";

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
  const customerSession = useCustomerSessionOptional();
  const { accountsEnabled } = useCustomerAccountMode();
  const { mode: fulfillmentModeFromContext, multiLocation } = useCatalogFulfillment();
  const activeFulfillmentMode = fulfillmentMode ?? fulfillmentModeFromContext;
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerCheckoutProfile | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState<string | null>(null);
  const [meetingPointId, setMeetingPointId] = useState<string | null>(null);
  const [pickupPointId, setPickupPointId] = useState<string | null>(null);
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
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
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<CheckoutFieldKey, boolean>>
  >({});
  const [validationAttemptedStep, setValidationAttemptedStep] = useState<
    0 | 1 | 2
  >(0);

  useEffect(() => {
    if (
      !customerSession?.isCustomer ||
      !customerSession.displayName ||
      !customerSession.phone
    ) {
      return;
    }

    setCustomerName(customerSession.displayName);
    setCustomerPhone(customerSession.phone);
    setCustomerProfile((current) =>
      current ?? {
        displayName: customerSession.displayName!,
        phone: customerSession.phone!,
      },
    );
  }, [
    customerSession?.isCustomer,
    customerSession?.displayName,
    customerSession?.phone,
  ]);

  const shippingOptions = useMemo(
    () => purchaseInfo.shipping ?? [],
    [purchaseInfo.shipping],
  );
  const paymentOptions = useMemo(
    () => purchaseInfo.payments ?? [],
    [purchaseInfo.payments],
  );
  const deliveryZones = useMemo(
    () => purchaseInfo.deliveryZones ?? [],
    [purchaseInfo.deliveryZones],
  );
  const pickupPoints = useMemo(
    () => purchaseInfo.pickupPoints ?? [],
    [purchaseInfo.pickupPoints],
  );

  useEffect(() => {
    if (shippingOptions.length === 1) {
      setSelectedShipping(shippingOptions[0].key);
    }
    setSelectedPayment(pickDefaultPaymentKey(paymentOptions));
  }, [paymentOptions, shippingOptions]);

  const isNationalCarrierSelected = isNationalCarrierKey(selectedShipping);
  const isLocalDeliverySelected = selectedShipping === "delivery";
  const isPickupSelected = selectedShipping === "pickup";
  const deliveryZonesForCheckout = useMemo(
    () =>
      deliveryZones.filter((zone) => (zone.meetingPoints?.length ?? 0) > 0),
    [deliveryZones],
  );
  const hasDeliveryZones = deliveryZonesForCheckout.length > 0;
  const hasPickupPoints = pickupPoints.length > 0;

  useEffect(() => {
    if (!isNationalCarrierSelected) {
      setShippingBranchCode(null);
    }
  }, [isNationalCarrierSelected, selectedShipping]);

  useEffect(() => {
    if (!isLocalDeliverySelected) {
      setDeliveryZoneId(null);
      setMeetingPointId(null);
    }
  }, [isLocalDeliverySelected]);

  useEffect(() => {
    if (!isPickupSelected) {
      setPickupPointId(null);
    }
  }, [isPickupSelected]);

  useEffect(() => {
    if (selectedShipping || shippingOptions.length === 0) return;

    if (fulfillmentMode === "pickup") {
      const pickup = shippingOptions.find((method) => method.key === "pickup");
      if (pickup) setSelectedShipping("pickup");
      return;
    }

    const delivery = shippingOptions.find((method) => method.key === "delivery");
    if (delivery) setSelectedShipping("delivery");
  }, [fulfillmentMode, shippingOptions, selectedShipping]);

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
          shippingOptions.some((option) => option.key === preferredMethod)
        ) {
          setSelectedShipping(preferredMethod);
          if (
            isNationalCarrierKey(preferredMethod) &&
            context.preferredShippingBranchCode
          ) {
            setShippingBranchCode(context.preferredShippingBranchCode);
          }
        } else if (fulfillmentMode === "pickup") {
          const pickup = shippingOptions.find((method) => method.key === "pickup");
          if (pickup) setSelectedShipping("pickup");
        } else if (fulfillmentMode === "delivery") {
          const delivery = shippingOptions.find(
            (method) => method.key === "delivery",
          );
          if (delivery) setSelectedShipping("delivery");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeSlug, fulfillmentMode, shippingOptions]);

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
      paymentOptions.find((payment) => payment.key === selectedPayment) ??
      null
    );
  }, [paymentOptions, selectedPayment]);

  const shippingLabel =
    shippingOptions.find((option) => option.key === selectedShipping)
      ?.label ?? "";
  const paymentLabel =
    paymentOptions.find((payment) => payment.key === selectedPayment)
      ?.label ?? "";

  const orderLines = useMemo<SubmitOrderLineInput[]>(
    () => buildSubmitOrderLinesFromCartItems(items),
    [items],
  );

  const step1Validation = useMemo(
    () =>
      validateCheckoutStep1({
        itemsCount: items.length,
        shippingOptionsCount: shippingOptions.length,
        selectedShipping,
        isNationalCarrierSelected,
        shippingBranchCode,
        isLocalDeliverySelected,
        hasDeliveryZones,
        deliveryZoneId,
        meetingPointId,
        deliveryAddress,
        isPickupSelected,
        hasPickupPoints,
        pickupPointId,
      }),
    [
      items.length,
      shippingOptions.length,
      selectedShipping,
      isNationalCarrierSelected,
      shippingBranchCode,
      isLocalDeliverySelected,
      hasDeliveryZones,
      deliveryZoneId,
      meetingPointId,
      deliveryAddress,
      isPickupSelected,
      hasPickupPoints,
      pickupPointId,
    ],
  );

  const showsProofUpload = paymentMethodRequiresProof(selectedPayment);

  const step2Validation = useMemo(
    () =>
      validateCheckoutStep2({
        itemsCount: items.length,
        hasCustomerProfile: Boolean(customerProfile),
        customerName,
        customerPhone,
        shippingOptionsCount: purchaseInfo.shipping.length,
        selectedShipping,
        paymentsCount: paymentOptions.length,
        selectedPayment,
        hasProofFile: Boolean(proofFile),
        requiresProofFile: false,
      }),
    [
      items.length,
      customerProfile,
      customerName,
      customerPhone,
      purchaseInfo.shipping.length,
      selectedShipping,
      paymentOptions.length,
      selectedPayment,
      proofFile,
    ],
  );

  const activeValidation =
    checkoutStep === 1 ? step1Validation : step2Validation;
  const canProceedCurrentStep = activeValidation.isValid;

  function touchField(field: CheckoutFieldKey) {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true },
    );
  }

  function shouldShowFieldError(
    field: CheckoutFieldKey,
    message?: string,
  ): message is string {
    if (!message) return false;
    return (
      Boolean(touchedFields[field]) ||
      validationAttemptedStep >= checkoutStep
    );
  }

  function markInvalidFieldsTouched(
    errors: Partial<Record<CheckoutFieldKey, string>>,
  ) {
    setTouchedFields((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(errors) as CheckoutFieldKey[]) {
        next[key] = true;
      }
      return next;
    });
  }

  function scrollToFirstCheckoutError(field: CheckoutFieldKey | null) {
    if (!field || typeof document === "undefined") return;
    window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-checkout-field="${field}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }


  const canProceedStep1 = step1Validation.isValid;
  const canSubmitStep2 = step2Validation.isValid && !pending;

  function handleFooterAction() {
    setError(null);

    if (checkoutStep === 1) {
      if (!canProceedStep1) {
        setValidationAttemptedStep(1);
        markInvalidFieldsTouched(step1Validation.errors);
        setError(summarizeCheckoutValidation(step1Validation));
        scrollToFirstCheckoutError(step1Validation.firstErrorField);
        return;
      }
      setValidationAttemptedStep(0);
      setCheckoutStep(2);
      return;
    }

    if (!canSubmitStep2) {
      setValidationAttemptedStep(2);
      markInvalidFieldsTouched(step2Validation.errors);
      setError(summarizeCheckoutValidation(step2Validation));
      scrollToFirstCheckoutError(step2Validation.firstErrorField);
      return;
    }

    if (paymentOptions.length > 0 && !selectedPayment) {
      return;
    }

    const hasCustomerData = customerProfile
      ? true
      : customerName.trim().length >= 2 && customerPhone.trim().length >= 10;

    if (!hasCustomerData) {
      return;
    }

    let submitLines = orderLines;
    if (submitLines.length === 0) {
      if (items.length === 0) {
        setError("Tu carrito está vacío.");
        return;
      }
      // Fallback por si el builder filtró de más: el servidor resuelve variantes.
      submitLines = items
        .map((item) => ({
          productId: String(item.product?.product_id ?? "").trim(),
          variantId: String(
            item.variantId || item.product?.default_variant_id || "",
          ).trim(),
          productName:
            String(item.product?.product_name ?? "").trim() || "Producto",
          variantName: String(item.variantName ?? "").trim() || "Estándar",
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          unitPriceUsd: Number(item.unitPriceUsd) || 0,
          wholesaleApplied: Boolean(item.wholesaleApplied),
        }))
        .filter((line) => line.productId.length > 0);
    }

    if (submitLines.length === 0) {
      setError(
        "Tu carrito no tiene productos válidos. Vuelve al catálogo e intenta de nuevo.",
      );
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
    formData.set("items", JSON.stringify(submitLines));
    if (proofFile) {
      formData.set("paymentProof", proofFile);
    }
    if (appliedPromotion) {
      formData.set("promotionCode", appliedPromotion.code);
    }
    if (selectedShipping) formData.set("shippingMethod", selectedShipping);
    if (selectedPayment) formData.set("paymentMethod", selectedPayment);

    if (isPickupSelected) {
      formData.set("fulfillmentType", "pickup");
      if (hasPickupPoints && pickupPointId) {
        formData.set("pickupPointId", pickupPointId);
      }
      if (fulfillmentNotes.trim()) {
        formData.set("fulfillmentNotes", fulfillmentNotes.trim());
      }
    } else if (isLocalDeliverySelected) {
      formData.set("fulfillmentType", "delivery");
      if (hasDeliveryZones) {
        if (deliveryZoneId) formData.set("deliveryZoneId", deliveryZoneId);
        if (meetingPointId) formData.set("meetingPointId", meetingPointId);
        if (fulfillmentNotes.trim()) {
          formData.set("fulfillmentNotes", fulfillmentNotes.trim());
        }
        if (deliveryAddress.trim()) {
          formData.set("deliveryAddress", deliveryAddress.trim());
        }
      } else if (deliveryAddress.trim()) {
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
      setDeliveryZoneId(null);
      setMeetingPointId(null);
      setPickupPointId(null);
      setFulfillmentNotes("");
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
                    <CatalogLocationPicker showFulfillmentModes />
                  </div>
                ) : null}

                <CartLineItems
                  items={items}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                />

                {shippingOptions.length > 0 ||
                isNationalCarrierSelected ||
                isLocalDeliverySelected ||
                (isPickupSelected && hasPickupPoints) ? (
                  <div className="txn-checkout-options">
                    {shippingOptions.length > 0 ? (
                      <CheckoutFieldGroup
                        field="shipping"
                        showError={shouldShowFieldError(
                          "shipping",
                          step1Validation.errors.shipping,
                        )}
                        error={step1Validation.errors.shipping}
                      >
                        <div className="txn-checkout-section">
                          <p className="txn-checkout-section-title">
                            Método de envío
                          </p>
                          <div className="txn-checkout-method-grid">
                            {shippingOptions.map((option) => (
                              <ShippingMethodCard
                                key={option.key}
                                carrierKey={option.key}
                                details={option.details}
                                description={option.description}
                                estimatedTime={option.estimatedTime}
                                selectable
                                selected={selectedShipping === option.key}
                                onSelect={() => {
                                  touchField("shipping");
                                  setSelectedShipping(option.key);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </CheckoutFieldGroup>
                    ) : null}

                    {isNationalCarrierSelected ? (
                      <CheckoutFieldGroup
                        field="shippingBranch"
                        showError={shouldShowFieldError(
                          "shippingBranch",
                          step1Validation.errors.shippingBranch,
                        )}
                        error={step1Validation.errors.shippingBranch}
                      >
                        <ShippingBranchPicker
                          carrier={selectedShipping as ShippingCarrierKey}
                          value={shippingBranchCode}
                          onChange={(branch) => {
                            touchField("shippingBranch");
                            setShippingBranchCode(branch?.id ?? null);
                          }}
                        />
                      </CheckoutFieldGroup>
                    ) : null}

                    {isLocalDeliverySelected ? (
                      hasDeliveryZones ? (
                        <CheckoutFieldGroup
                          field={
                            step1Validation.errors.meetingPoint
                              ? "meetingPoint"
                              : "deliveryZone"
                          }
                          showError={
                            shouldShowFieldError(
                              "deliveryZone",
                              step1Validation.errors.deliveryZone,
                            ) ||
                            shouldShowFieldError(
                              "meetingPoint",
                              step1Validation.errors.meetingPoint,
                            )
                          }
                          error={
                            step1Validation.errors.deliveryZone ??
                            step1Validation.errors.meetingPoint
                          }
                        >
                          <DeliveryZonePicker
                            zones={deliveryZonesForCheckout}
                            selectedZoneId={deliveryZoneId}
                            selectedPointId={meetingPointId}
                            notes={fulfillmentNotes}
                            onZoneChange={(zoneId) => {
                              touchField("deliveryZone");
                              setDeliveryZoneId(zoneId);
                            }}
                            onPointChange={(pointId) => {
                              touchField("meetingPoint");
                              setMeetingPointId(pointId);
                            }}
                            onNotesChange={setFulfillmentNotes}
                          />
                        </CheckoutFieldGroup>
                      ) : (
                        <CheckoutFieldGroup
                          field="deliveryAddress"
                          showError={shouldShowFieldError(
                            "deliveryAddress",
                            step1Validation.errors.deliveryAddress,
                          )}
                          error={step1Validation.errors.deliveryAddress}
                        >
                          <label className="txn-field">
                            <span>Dirección de entrega</span>
                            <textarea
                              required
                              minLength={8}
                              rows={3}
                              value={deliveryAddress}
                              onChange={(event) => {
                                touchField("deliveryAddress");
                                setDeliveryAddress(event.target.value);
                              }}
                              onBlur={() => touchField("deliveryAddress")}
                              placeholder="Calle, edificio, referencia…"
                              aria-invalid={shouldShowFieldError(
                                "deliveryAddress",
                                step1Validation.errors.deliveryAddress,
                              )}
                              aria-describedby={
                                step1Validation.errors.deliveryAddress
                                  ? "checkout-error-deliveryAddress"
                                  : undefined
                              }
                              className={checkoutInputClass(
                                shouldShowFieldError(
                                  "deliveryAddress",
                                  step1Validation.errors.deliveryAddress,
                                ),
                                "min-h-[5rem] resize-y",
                              )}
                            />
                          </label>
                        </CheckoutFieldGroup>
                      )
                    ) : null}

                    {isPickupSelected && hasPickupPoints ? (
                      <CheckoutFieldGroup
                        field="pickupPoint"
                        showError={shouldShowFieldError(
                          "pickupPoint",
                          step1Validation.errors.pickupPoint,
                        )}
                        error={step1Validation.errors.pickupPoint}
                      >
                        <PickupPointPicker
                          points={pickupPoints}
                          selectedPointId={pickupPointId}
                          notes={fulfillmentNotes}
                          onPointChange={(pointId) => {
                            touchField("pickupPoint");
                            setPickupPointId(pointId);
                          }}
                          onNotesChange={setFulfillmentNotes}
                        />
                      </CheckoutFieldGroup>
                    ) : null}
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
                <div className="txn-checkout-section px-6 pt-5">
                  <p className="txn-checkout-section-title">Productos</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Puedes quitar o cambiar cantidades antes de confirmar.
                  </p>
                </div>
                <CartLineItems
                  items={items}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  compact
                />

                <div className="txn-checkout-options">
                  {paymentOptions.length > 0 && (
                    <CheckoutFieldGroup
                      field="payment"
                      showError={shouldShowFieldError(
                        "payment",
                        step2Validation.errors.payment,
                      )}
                      error={step2Validation.errors.payment}
                      className="txn-checkout-section"
                    >
                      <p className="txn-checkout-section-title">Método de pago</p>
                      <div className="txn-checkout-method-grid">
                        {paymentOptions.map((payment) => (
                          <PaymentMethodCard
                            key={payment.key}
                            methodKey={payment.key as PaymentMethodKey}
                            selectable
                            selected={selectedPayment === payment.key}
                            onSelect={() => {
                              touchField("payment");
                              setSelectedPayment(payment.key);
                              if (!paymentMethodRequiresProof(payment.key)) {
                                setProofFile(null);
                              }
                            }}
                          />
                        ))}
                      </div>
                      {selectedPaymentDetails && (
                        <PaymentCheckoutDetails
                          methodKey={selectedPaymentDetails.key}
                          fields={selectedPaymentDetails.fields}
                        />
                      )}
                    </CheckoutFieldGroup>
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
                      {accountsEnabled
                        ? "Compra sin cuenta: solo nombre y teléfono para coordinar tu pedido. Crear una cuenta con contraseña es opcional al finalizar."
                        : "Compra como invitado: solo nombre y teléfono para coordinar tu pedido."}
                    </p>
                    <CheckoutFieldGroup
                      field="customerName"
                      showError={shouldShowFieldError(
                        "customerName",
                        step2Validation.errors.customerName,
                      )}
                      error={step2Validation.errors.customerName}
                    >
                      <label className="txn-field">
                        <span>Nombre</span>
                        <input
                          type="text"
                          required
                          minLength={2}
                          value={customerName}
                          onChange={(event) => {
                            touchField("customerName");
                            setCustomerName(event.target.value);
                          }}
                          onBlur={() => touchField("customerName")}
                          placeholder="Tu nombre completo"
                          aria-invalid={shouldShowFieldError(
                            "customerName",
                            step2Validation.errors.customerName,
                          )}
                          aria-describedby={
                            step2Validation.errors.customerName
                              ? "checkout-error-customerName"
                              : undefined
                          }
                          className={checkoutInputClass(
                            shouldShowFieldError(
                              "customerName",
                              step2Validation.errors.customerName,
                            ),
                          )}
                        />
                      </label>
                    </CheckoutFieldGroup>

                    <CheckoutFieldGroup
                      field="customerPhone"
                      showError={shouldShowFieldError(
                        "customerPhone",
                        step2Validation.errors.customerPhone,
                      )}
                      error={step2Validation.errors.customerPhone}
                      className="mt-3"
                    >
                      <label className="txn-field">
                        <span>Teléfono / WhatsApp</span>
                        <input
                          type="tel"
                          required
                          inputMode="tel"
                          autoComplete="tel"
                          minLength={10}
                          value={customerPhone}
                          onChange={(event) => {
                            touchField("customerPhone");
                            setCustomerPhone(event.target.value);
                          }}
                          onBlur={() => touchField("customerPhone")}
                          placeholder="Ej: 0414-1234567"
                          aria-invalid={shouldShowFieldError(
                            "customerPhone",
                            step2Validation.errors.customerPhone,
                          )}
                          aria-describedby={
                            step2Validation.errors.customerPhone
                              ? "checkout-error-customerPhone"
                              : undefined
                          }
                          className={checkoutInputClass(
                            shouldShowFieldError(
                              "customerPhone",
                              step2Validation.errors.customerPhone,
                            ),
                          )}
                        />
                      </label>
                    </CheckoutFieldGroup>
                  </div>
                )}

                {showsProofUpload ? (
                  <CheckoutFieldGroup
                    field="proofFile"
                    showError={shouldShowFieldError(
                      "proofFile",
                      step2Validation.errors.proofFile,
                    )}
                    error={step2Validation.errors.proofFile}
                    className="txn-checkout-form"
                  >
                    <label className="txn-field">
                      <span>
                        Comprobante de pago{" "}
                        <span className="font-normal text-zinc-500">
                          (opcional)
                        </span>
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) => {
                          touchField("proofFile");
                          setProofFile(event.target.files?.[0] ?? null);
                        }}
                        onBlur={() => touchField("proofFile")}
                        aria-invalid={shouldShowFieldError(
                          "proofFile",
                          step2Validation.errors.proofFile,
                        )}
                        aria-describedby={
                          step2Validation.errors.proofFile
                            ? "checkout-error-proofFile"
                            : "checkout-proof-optional-hint"
                        }
                        className={checkoutFileInputClass(
                          shouldShowFieldError(
                            "proofFile",
                            step2Validation.errors.proofFile,
                          ),
                        )}
                      />
                    </label>
                    <p
                      id="checkout-proof-optional-hint"
                      className="mt-1.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400"
                    >
                      Puedes confirmar el pedido sin adjuntar archivo y enviar
                      el comprobante después por WhatsApp.
                    </p>
                  </CheckoutFieldGroup>
                ) : selectedPayment ? (
                  <p className="txn-checkout-hint rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                    Con este método de pago no necesitas subir comprobante. El
                    pago se confirma al entregar o en el local.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            {checkoutStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setValidationAttemptedStep(0);
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
              disabled={pending}
              className={cn(
                "txn-submit-btn",
                !canProceedCurrentStep &&
                  !pending &&
                  "txn-submit-btn--blocked",
              )}
              aria-disabled={!canProceedCurrentStep || pending}
            >
              {submitButtonLabel}
            </button>

            {!canProceedCurrentStep && !pending ? (
              <p className="txn-checkout-blocked-hint" role="status">
                {checkoutStep === 2
                  ? "Completa nombre, teléfono y método de pago para confirmar."
                  : "Completa el envío y los campos obligatorios para continuar."}
              </p>
            ) : null}

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
