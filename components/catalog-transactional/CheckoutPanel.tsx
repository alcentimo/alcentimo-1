"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ShoppingBag, X } from "lucide-react";
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
import { formatUsd, formatExchangeRate, formatUsdWithApproxBs } from "@/lib/format";
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
  validateCustomerPromotionCode,
} from "@/lib/promotions/actions";
import { calculatePromotionDiscountUsd } from "@/lib/promotions/discount";
import type { AppliedPromotion } from "@/lib/promotions/types";
import {
  formatShippingOptionHint,
  resolveShippingQuote,
} from "@/lib/store-settings/shipping-pricing";
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
  CheckoutStepper,
  type CheckoutStep,
} from "@/components/catalog/CheckoutStepper";
import {
  hasCompleteCheckoutCustomerData,
  summarizeCheckoutValidation,
  validateProgressiveCheckoutStep,
  type CheckoutFieldKey,
} from "@/lib/catalog/checkout-validation";
import {
  isValidCustomerPhone,
  normalizeCustomerPhone,
} from "@/lib/customers/phone-auth";
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
  /**
   * Paso inicial. Desde el resumen del carrito se usa 2 para evitar
   * la pantalla intermedia de "Completar pedido".
   */
  initialStep?: CheckoutStep;
  /** Si está en Datos y vuelve atrás, regresa al resumen del carrito. */
  onBackToCart?: () => void;
}

interface CustomerCheckoutProfile {
  displayName: string;
  phone: string;
  contactEmail?: string | null;
  deliveryAddress?: string | null;
  preferredShippingMethod?: string | null;
  preferredShippingBranchCode?: string | null;
}

function normalizeCheckoutPhone(phone: string | null | undefined): string {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) return "";
  return isValidCustomerPhone(trimmed)
    ? normalizeCustomerPhone(trimmed)
    : trimmed;
}

function pickDefaultPaymentKey(
  payments: PublicPurchaseInfo["payments"],
): string {
  if (payments.length === 0) return "";
  if (payments.length === 1) return payments[0]!.key;
  const pagoMovil = payments.find((payment) => payment.key === "pagoMovil");
  return pagoMovil?.key ?? payments[0]!.key;
}

function resolveSelectedPaymentKey(
  current: string,
  payments: PublicPurchaseInfo["payments"],
): string {
  if (current && payments.some((payment) => payment.key === current)) {
    return current;
  }
  return pickDefaultPaymentKey(payments);
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
  initialStep = 1,
  onBackToCart,
}: CheckoutPanelProps) {
  const pathname = usePathname();
  const { items, subtotalUsd, updateQuantity, removeItem, clearCart } =
    useCart();
  const { autoApply } = usePromotionContext();
  const customerSession = useCustomerSessionOptional();
  const { accountsEnabled } = useCustomerAccountMode();
  const { mode: fulfillmentModeFromContext, multiLocation } = useCatalogFulfillment();
  const activeFulfillmentMode = fulfillmentMode ?? fulfillmentModeFromContext;
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
    whatsappUrl: string | null;
    hasPaymentProof: boolean;
    wasGuest: boolean;
  } | null>(null);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(() =>
    pickDefaultPaymentKey(purchaseInfo.payments ?? []),
  );
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
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(initialStep);
  const autoSkippedCustomerStepRef = useRef(false);

  useEffect(() => {
    const loggedIn =
      customerSession?.isAuthenticated || customerSession?.isCustomer;
    if (!loggedIn) return;

    const name = customerSession.displayName?.trim() ?? "";
    const phone = normalizeCheckoutPhone(customerSession.phone);
    const email = customerSession.contactEmail?.trim() || null;

    if (name.length >= 2) {
      setCustomerName(name);
    }
    if (phone) {
      setCustomerPhone(phone);
    }

    if (hasCompleteCheckoutCustomerData(name, phone)) {
      setCustomerProfile((current) => ({
        displayName: name,
        phone,
        contactEmail: email ?? current?.contactEmail ?? null,
        deliveryAddress: current?.deliveryAddress ?? null,
        preferredShippingMethod: current?.preferredShippingMethod ?? null,
        preferredShippingBranchCode:
          current?.preferredShippingBranchCode ?? null,
      }));
    }
  }, [
    customerSession?.isAuthenticated,
    customerSession?.isCustomer,
    customerSession?.displayName,
    customerSession?.phone,
    customerSession?.contactEmail,
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
      setSelectedShipping(shippingOptions[0]!.key);
    }
    setSelectedPayment((current) =>
      resolveSelectedPaymentKey(current, paymentOptions),
    );
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

      const loggedIn = context.isAuthenticated || context.isCustomer;
      if (!loggedIn) return;

      const name = context.displayName?.trim() ?? "";
      const phone = normalizeCheckoutPhone(context.phone);
      const email = context.contactEmail?.trim() || null;

      if (name.length >= 2) {
        setCustomerName(name);
      }
      if (phone) {
        setCustomerPhone(phone);
      }

      if (hasCompleteCheckoutCustomerData(name, phone)) {
        setCustomerProfile({
          displayName: name,
          phone,
          contactEmail: email,
          deliveryAddress: context.deliveryAddress,
          preferredShippingMethod: context.preferredShippingMethod,
          preferredShippingBranchCode: context.preferredShippingBranchCode,
        });
      }

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
    });

    return () => {
      cancelled = true;
    };
  }, [storeSlug, fulfillmentMode, shippingOptions]);

  // Si el comprador ya tiene nombre y teléfono, salta directo a envío.
  useEffect(() => {
    if (autoSkippedCustomerStepRef.current) return;
    if (initialStep !== 2 || checkoutStep !== 2) return;
    if (!customerProfile) return;

    autoSkippedCustomerStepRef.current = true;
    setCheckoutStep(3);
  }, [customerProfile, checkoutStep, initialStep]);

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

  const merchandiseUsd = Math.max(0, subtotalUsd - discountUsd);

  const shippingQuote = useMemo(
    () =>
      resolveShippingQuote({
        pricing: purchaseInfo.shippingPricing,
        method: selectedShipping,
        merchandiseUsd,
      }),
    [purchaseInfo.shippingPricing, selectedShipping, merchandiseUsd],
  );

  const totalUsd = merchandiseUsd + shippingQuote.chargeUsd;
  const totalLocal =
    showBsConversion && exchangeRate && exchangeRate > 0
      ? totalUsd * exchangeRate
      : null;

  const submitButtonLabel = pending
    ? "Procesando…"
    : checkoutStep === 1
      ? "Completar pedido"
      : checkoutStep === 2
        ? "Continuar a envío"
        : checkoutStep === 3
          ? "Continuar al pago"
          : "Confirmar Pedido";

  const stepTitles: Record<CheckoutStep, string> = {
    1: "Tu carrito",
    2: "Tus datos",
    3: "Envío",
    4: "Pago",
  };

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
  const shippingDisplayLabel = shippingLabel
    ? `${shippingLabel} · ${shippingQuote.chargeLabel}`
    : shippingQuote.chargeLabel !== "—"
      ? shippingQuote.chargeLabel
      : "";
  const shippingHint = formatShippingOptionHint(shippingQuote);
  const paymentLabel =
    paymentOptions.find((payment) => payment.key === selectedPayment)
      ?.label ?? "";

  const orderLines = useMemo<SubmitOrderLineInput[]>(
    () => buildSubmitOrderLinesFromCartItems(items),
    [items],
  );

  const showsProofUpload = paymentMethodRequiresProof(selectedPayment);

  const shippingValidationInput = useMemo(
    () => ({
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

  const customerValidationInput = useMemo(
    () => ({
      itemsCount: items.length,
      hasCustomerProfile: Boolean(customerProfile),
      customerName,
      customerPhone,
    }),
    [items.length, customerProfile, customerName, customerPhone],
  );

  const paymentValidationInput = useMemo(
    () => ({
      itemsCount: items.length,
      paymentsCount: paymentOptions.length,
      selectedPayment,
      hasProofFile: Boolean(proofFile),
      requiresProofFile: false as const,
    }),
    [items.length, paymentOptions.length, selectedPayment, proofFile],
  );

  const stepValidation = useMemo(
    () =>
      validateProgressiveCheckoutStep(checkoutStep, {
        itemsCount: items.length,
        customer: customerValidationInput,
        shipping: shippingValidationInput,
        payment: paymentValidationInput,
      }),
    [
      checkoutStep,
      items.length,
      customerValidationInput,
      shippingValidationInput,
      paymentValidationInput,
    ],
  );

  const canProceedCurrentStep = stepValidation.isValid && !pending;

  useEffect(() => {
    if (items.length === 0 && checkoutStep !== 1) {
      if (onBackToCart) {
        onBackToCart();
        return;
      }
      setCheckoutStep(1);
      setValidationAttempted(false);
      setTouchedFields({});
      setError(null);
    }
  }, [items.length, checkoutStep, onBackToCart]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const scrollRoot = document.querySelector(".txn-checkout-scroll");
    if (scrollRoot instanceof HTMLElement) {
      scrollRoot.scrollTop = 0;
    }
  }, [checkoutStep]);

  function goToStep(step: CheckoutStep) {
    if (step === 1 && onBackToCart) {
      onBackToCart();
      return;
    }
    setError(null);
    setValidationAttempted(false);
    setTouchedFields({});
    setCheckoutStep(step);
  }

  function goBackStep() {
    if (checkoutStep <= 1) return;
    if (checkoutStep === 2 && onBackToCart) {
      onBackToCart();
      return;
    }
    goToStep((checkoutStep - 1) as CheckoutStep);
  }

  function touchField(field: CheckoutFieldKey) {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true },
    );
  }

  /** Errores de campo solo tras intentar Continuar en el paso actual. */
  function shouldShowFieldError(
    _field: CheckoutFieldKey,
    message?: string,
  ): message is string {
    return Boolean(validationAttempted && message);
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

    const focusTarget = () => {
      const group = document.querySelector<HTMLElement>(
        `[data-checkout-field="${field}"]`,
      );
      if (!group) return;

      const scrollRoot = group.closest(".txn-checkout-scroll");
      if (scrollRoot instanceof HTMLElement) {
        const groupRect = group.getBoundingClientRect();
        const rootRect = scrollRoot.getBoundingClientRect();
        const nextTop =
          scrollRoot.scrollTop +
          (groupRect.top - rootRect.top) -
          Math.max(24, rootRect.height * 0.2);
        scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
      } else {
        group.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      const focusable = group.querySelector<HTMLElement>(
        [
          'input:not([type="hidden"]):not([type="file"])',
          'input[type="file"]',
          "select",
          "textarea",
          "button.shipping-method-card-interactive",
          "button[aria-pressed]",
          'button[role="radio"]',
          "button[data-checkout-focus]",
        ].join(", "),
      );

      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
      }
    };

    window.requestAnimationFrame(() => {
      focusTarget();
      window.setTimeout(focusTarget, 320);
    });
  }

  function handleFooterAction() {
    setError(null);

    if (!stepValidation.isValid) {
      setValidationAttempted(true);
      markInvalidFieldsTouched(stepValidation.errors);
      setError(summarizeCheckoutValidation(stepValidation));
      scrollToFirstCheckoutError(stepValidation.firstErrorField);
      return;
    }

    if (checkoutStep < 4) {
      goToStep((checkoutStep + 1) as CheckoutStep);
      return;
    }

    if (paymentOptions.length > 0 && !selectedPayment) {
      return;
    }

    const hasCustomerData = customerProfile
      ? true
      : hasCompleteCheckoutCustomerData(customerName, customerPhone);

    if (!hasCustomerData) {
      goToStep(2);
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

    // Capturar si había comprobante antes de limpiar el estado local.
    const submittedWithProof = Boolean(proofFile && proofFile.size > 0);

    startTransition(async () => {
      const result = await submitTransactionalOrder(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      // WhatsApp es opcional en la pantalla de éxito; no abrir ni redirigir aquí.
      const whatsappUrl = result.whatsappUrl?.trim() || null;

      // Invitado = sin sesión activa. No usar !customerProfile: un cliente
      // logueado puede completar el pedido sin tarjeta de perfil en memoria.
      const wasGuest = !(
        customerSession?.isAuthenticated || customerSession?.isCustomer
      );

      clearCart();
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
      setValidationAttempted(false);
      setTouchedFields({});
      setCheckoutStep(1);

      if (result.orderId) {
        setSuccessOrder({
          orderId: result.orderId,
          totalUsd,
          whatsappUrl,
          hasPaymentProof: submittedWithProof,
          wasGuest,
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
          whatsappUrl={successOrder.whatsappUrl}
          hasPaymentProof={successOrder.hasPaymentProof}
          wasGuest={successOrder.wasGuest}
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
        <div className="txn-checkout-header-main">
          {checkoutStep > 1 ? (
            <button
              type="button"
              onClick={goBackStep}
              className="txn-checkout-back"
              aria-label={
                checkoutStep === 2
                  ? "Volver al carrito"
                  : checkoutStep === 3
                    ? "Volver a datos"
                    : "Volver a envío"
              }
            >
              ←
            </button>
          ) : null}
          <div className="min-w-0">
            <h2 className="txn-checkout-title">{stepTitles[checkoutStep]}</h2>
            <p className="txn-checkout-subtitle">{storeName}</p>
          </div>
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
          <CheckoutStepper
            step={checkoutStep}
            onStepSelect={goToStep}
          />

          <div className="txn-checkout-scroll" key={checkoutStep}>
            {checkoutStep === 1 ? (
              <section aria-labelledby="checkout-products-heading">
                {multiLocation ? (
                  <div className="px-6 pt-4">
                    <CatalogLocationPicker showFulfillmentModes />
                  </div>
                ) : null}
                <div className="px-6 pt-5">
                  <h3
                    id="checkout-products-heading"
                    className="txn-checkout-section-title"
                  >
                    Productos
                  </h3>
                </div>
                <CartLineItems
                  items={items}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  exchangeRate={exchangeRate}
                  showBsConversion={showBsConversion}
                  className="!pt-3"
                />

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
              </section>
            ) : null}

            {checkoutStep === 2 ? (
              <section aria-labelledby="checkout-customer-heading">
                {customerProfile ? (
                  <div className="txn-checkout-customer-card !mt-5">
                    <h3
                      id="checkout-customer-heading"
                      className="txn-checkout-section-title"
                    >
                      Datos del cliente
                    </h3>
                    <dl className="txn-checkout-customer-dl">
                      <div>
                        <dt>Nombre</dt>
                        <dd>{customerProfile.displayName}</dd>
                      </div>
                      <div>
                        <dt>Teléfono</dt>
                        <dd>{customerProfile.phone}</dd>
                      </div>
                      {customerProfile.contactEmail ? (
                        <div>
                          <dt>Correo</dt>
                          <dd>{customerProfile.contactEmail}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <Link
                      href={getStoreCustomerAccountPath(storeSlug, "perfil", {
                        pathname,
                      })}
                      className="txn-checkout-customer-link"
                    >
                      Editar en Mi perfil
                    </Link>
                  </div>
                ) : (
                  <div className="txn-checkout-form">
                    <h3
                      id="checkout-customer-heading"
                      className="txn-checkout-section-title"
                    >
                      Datos del cliente
                    </h3>
                    <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {customerSession?.isAuthenticated ||
                      customerSession?.isCustomer
                        ? "Usamos los datos de tu cuenta. Completa solo lo que falte."
                        : accountsEnabled
                          ? "Obligatorio para coordinar tu pedido. Crear una cuenta es opcional."
                          : "Nombre y teléfono / WhatsApp para coordinar tu pedido."}
                    </p>
                    <CheckoutFieldGroup
                      field="customerName"
                      showError={shouldShowFieldError(
                        "customerName",
                        stepValidation.errors.customerName,
                      )}
                      error={stepValidation.errors.customerName}
                    >
                      <label className="txn-field">
                        <span>Nombre completo</span>
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
                          autoComplete="name"
                          aria-invalid={shouldShowFieldError(
                            "customerName",
                            stepValidation.errors.customerName,
                          )}
                          aria-describedby={
                            stepValidation.errors.customerName
                              ? "checkout-error-customerName"
                              : undefined
                          }
                          className={checkoutInputClass(
                            shouldShowFieldError(
                              "customerName",
                              stepValidation.errors.customerName,
                            ),
                          )}
                        />
                      </label>
                    </CheckoutFieldGroup>

                    <CheckoutFieldGroup
                      field="customerPhone"
                      showError={shouldShowFieldError(
                        "customerPhone",
                        stepValidation.errors.customerPhone,
                      )}
                      error={stepValidation.errors.customerPhone}
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
                            stepValidation.errors.customerPhone,
                          )}
                          aria-describedby={
                            stepValidation.errors.customerPhone
                              ? "checkout-error-customerPhone"
                              : undefined
                          }
                          className={checkoutInputClass(
                            shouldShowFieldError(
                              "customerPhone",
                              stepValidation.errors.customerPhone,
                            ),
                          )}
                        />
                      </label>
                    </CheckoutFieldGroup>
                  </div>
                )}
              </section>
            ) : null}

            {checkoutStep === 3 ? (
              <section aria-labelledby="checkout-shipping-heading">
                {shippingOptions.length > 0 ||
                isNationalCarrierSelected ||
                isLocalDeliverySelected ||
                (isPickupSelected && hasPickupPoints) ? (
                  <div className="txn-checkout-options !border-t-0">
                    {shippingOptions.length > 0 ? (
                      <CheckoutFieldGroup
                        field="shipping"
                        showError={shouldShowFieldError(
                          "shipping",
                          stepValidation.errors.shipping,
                        )}
                        error={stepValidation.errors.shipping}
                      >
                        <div className="txn-checkout-section">
                          <h3
                            id="checkout-shipping-heading"
                            className="txn-checkout-section-title"
                          >
                            Método de envío
                          </h3>
                          {purchaseInfo.shippingPricing.freeShippingEnabled ? (
                            <p
                              className={cn(
                                "mb-3 rounded-lg border px-3 py-2 text-xs leading-relaxed",
                                shippingQuote.freeShipping.unlocked
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
                              )}
                            >
                              {shippingQuote.freeShipping.unlocked
                                ? "¡Envío gratis desbloqueado en este pedido!"
                                : `Envío gratis desde ${formatUsd(purchaseInfo.shippingPricing.freeShippingMinUsd)}. ${
                                    shippingQuote.freeShipping.remainingUsd > 0
                                      ? `Te faltan ${formatUsd(shippingQuote.freeShipping.remainingUsd)}.`
                                      : ""
                                  }`}
                            </p>
                          ) : purchaseInfo.shippingPricing.mode === "cod" ? (
                            <p className="mb-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                              Modalidad: cobro a destino. Pagas el flete en la
                              agencia al retirar tu paquete.
                            </p>
                          ) : (
                            <p className="mb-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                              Modalidad: tarifa plana nacional de{" "}
                              {formatUsd(purchaseInfo.shippingPricing.flatRateUsd)}.
                            </p>
                          )}
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
                    ) : (
                      <div className="txn-checkout-section">
                        <h3
                          id="checkout-shipping-heading"
                          className="txn-checkout-section-title"
                        >
                          Método de envío
                        </h3>
                      </div>
                    )}

                    {isNationalCarrierSelected ? (
                      <CheckoutFieldGroup
                        field="shippingBranch"
                        showError={shouldShowFieldError(
                          "shippingBranch",
                          stepValidation.errors.shippingBranch,
                        )}
                        error={stepValidation.errors.shippingBranch}
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
                            stepValidation.errors.meetingPoint
                              ? "meetingPoint"
                              : "deliveryZone"
                          }
                          showError={
                            shouldShowFieldError(
                              "deliveryZone",
                              stepValidation.errors.deliveryZone,
                            ) ||
                            shouldShowFieldError(
                              "meetingPoint",
                              stepValidation.errors.meetingPoint,
                            )
                          }
                          error={
                            stepValidation.errors.deliveryZone ??
                            stepValidation.errors.meetingPoint
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
                            stepValidation.errors.deliveryAddress,
                          )}
                          error={stepValidation.errors.deliveryAddress}
                        >
                          <label className="txn-field">
                            <span>
                              Dirección de entrega{" "}
                              <span className="font-normal text-zinc-400">
                                (opcional)
                              </span>
                            </span>
                            <textarea
                              rows={3}
                              value={deliveryAddress}
                              onChange={(event) => {
                                touchField("deliveryAddress");
                                setDeliveryAddress(event.target.value);
                              }}
                              onBlur={() => touchField("deliveryAddress")}
                              placeholder="Calle, edificio, referencia… o acuerda por WhatsApp"
                              aria-invalid={shouldShowFieldError(
                                "deliveryAddress",
                                stepValidation.errors.deliveryAddress,
                              )}
                              aria-describedby={
                                stepValidation.errors.deliveryAddress
                                  ? "checkout-error-deliveryAddress"
                                  : "checkout-hint-deliveryAddress"
                              }
                              className={checkoutInputClass(
                                shouldShowFieldError(
                                  "deliveryAddress",
                                  stepValidation.errors.deliveryAddress,
                                ),
                                "min-h-[5rem] resize-y",
                              )}
                            />
                            <span
                              id="checkout-hint-deliveryAddress"
                              className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400"
                            >
                              Puedes dejarla vacía y acordar la entrega por
                              WhatsApp.
                            </span>
                          </label>
                        </CheckoutFieldGroup>
                      )
                    ) : null}

                    {isPickupSelected && hasPickupPoints ? (
                      <CheckoutFieldGroup
                        field="pickupPoint"
                        showError={shouldShowFieldError(
                          "pickupPoint",
                          stepValidation.errors.pickupPoint,
                        )}
                        error={stepValidation.errors.pickupPoint}
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
                ) : (
                  <div className="txn-checkout-section px-6 py-5">
                    <h3
                      id="checkout-shipping-heading"
                      className="txn-checkout-section-title"
                    >
                      Método de envío
                    </h3>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Esta tienda no tiene métodos de envío configurados. Se
                      coordinará por WhatsApp.
                    </p>
                  </div>
                )}
              </section>
            ) : null}

            {checkoutStep === 4 ? (
              <section aria-labelledby="checkout-payment-heading">
                <div className="txn-checkout-options !border-t-0">
                  {paymentOptions.length > 0 && (
                    <CheckoutFieldGroup
                      field="payment"
                      showError={shouldShowFieldError(
                        "payment",
                        stepValidation.errors.payment,
                      )}
                      error={stepValidation.errors.payment}
                      className="txn-checkout-section"
                    >
                      <h3
                        id="checkout-payment-heading"
                        className="txn-checkout-section-title"
                      >
                        Método de pago
                      </h3>
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

                {showsProofUpload ? (
                  <CheckoutFieldGroup
                    field="proofFile"
                    showError={shouldShowFieldError(
                      "proofFile",
                      stepValidation.errors.proofFile,
                    )}
                    error={stepValidation.errors.proofFile}
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
                          stepValidation.errors.proofFile,
                        )}
                        aria-describedby={
                          stepValidation.errors.proofFile
                            ? "checkout-error-proofFile"
                            : "checkout-proof-optional-hint"
                        }
                        className={checkoutFileInputClass(
                          shouldShowFieldError(
                            "proofFile",
                            stepValidation.errors.proofFile,
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
                  <p className="txn-checkout-hint mx-6 mb-3 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                    Con este método de pago no necesitas subir comprobante. El
                    pago se confirma al entregar o en el local.
                  </p>
                ) : null}
              </section>
            ) : null}

            {checkoutStep >= 3 &&
            ((discountUsd > 0 && appliedPromotion) ||
              (selectedShipping && shippingQuote.appliesPaidShipping) ||
              (shippingHint && selectedShipping)) ? (
              <div className="txn-checkout-order-meta">
                {discountUsd > 0 && appliedPromotion ? (
                  <div className="txn-checkout-total txn-checkout-total-discount !border-0 !px-0 !py-0">
                    <span>Descuento ({appliedPromotion.code})</span>
                    <strong>-{formatUsd(discountUsd)}</strong>
                  </div>
                ) : null}
                {selectedShipping && shippingQuote.appliesPaidShipping ? (
                  <div className="txn-checkout-total !border-0 !px-0 !py-0">
                    <span>Envío</span>
                    <strong
                      className={
                        shippingQuote.isFree
                          ? "text-emerald-700 dark:text-emerald-400"
                          : undefined
                      }
                    >
                      {shippingQuote.chargeLabel}
                    </strong>
                  </div>
                ) : null}
                {shippingHint && selectedShipping ? (
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {shippingHint}
                  </p>
                ) : null}
              </div>
            ) : null}

            {checkoutStep === 4 && showOfficialRate && exchangeRate ? (
              <div className="txn-checkout-rate-box mx-6 mb-3">
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

            {checkoutStep === 4 ? (
              <div className="txn-checkout-order-meta !pt-0">
                <p className="txn-checkout-hint !text-left">
                  {whatsappConfigured
                    ? "Al confirmar, verás el resumen del pedido. WhatsApp es opcional desde esa pantalla."
                    : "Tu pedido quedará registrado en el panel de la tienda."}
                </p>
                {shippingDisplayLabel || paymentLabel ? (
                  <p className="txn-checkout-hint !text-left">
                    {shippingDisplayLabel
                      ? `Envío: ${shippingDisplayLabel}`
                      : null}
                    {shippingDisplayLabel && paymentLabel ? " · " : null}
                    {paymentLabel ? `Pago: ${paymentLabel}` : null}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <footer className="txn-checkout-footer safe-area-bottom">
            {error ? (
              <p className="txn-checkout-error" role="alert">
                {error}
              </p>
            ) : null}

            {validationAttempted && !canProceedCurrentStep && !pending ? (
              <p className="txn-checkout-blocked-hint" role="status">
                {checkoutStep === 1
                  ? "Añade productos para completar el pedido."
                  : checkoutStep === 2
                    ? "Completa nombre y teléfono para continuar."
                    : checkoutStep === 3
                      ? "Selecciona el método de envío para continuar."
                      : "Selecciona el método de pago para enviar tu pedido."}
              </p>
            ) : null}

            <div className="txn-checkout-footer-bar">
              <div className="txn-checkout-footer-total">
                <span>{checkoutStep === 1 ? "Subtotal" : "Total"}</span>
                <strong className="tabular-nums">
                  {checkoutStep === 1
                    ? formatUsdWithApproxBs(
                        subtotalUsd,
                        exchangeRate,
                        showBsConversion,
                      )
                    : formatUsdWithApproxBs(
                        totalUsd,
                        exchangeRate,
                        showBsConversion && checkoutStep === 4,
                      )}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleFooterAction}
                disabled={pending}
                className={cn(
                  "txn-submit-btn txn-checkout-footer-cta",
                  validationAttempted &&
                    !canProceedCurrentStep &&
                    !pending &&
                    "txn-submit-btn--blocked",
                )}
                aria-disabled={
                  (validationAttempted && !canProceedCurrentStep) || pending
                }
              >
                {submitButtonLabel}
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
