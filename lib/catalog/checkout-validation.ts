import { isValidCustomerPhone } from "@/lib/customers/phone-auth";

/** Nombre + teléfono listos para saltar o confirmar el paso de cliente. */
export function hasCompleteCheckoutCustomerData(
  customerName: string,
  customerPhone: string,
): boolean {
  return (
    customerName.trim().length >= 2 && isValidCustomerPhone(customerPhone.trim())
  );
}

export type CheckoutFieldKey =
  | "shipping"
  | "shippingBranch"
  | "deliveryZone"
  | "meetingPoint"
  | "deliveryAddress"
  | "pickupPoint"
  | "customerName"
  | "customerPhone"
  | "payment"
  | "proofFile"
  | "cart";

export type ProgressiveCheckoutStep = 1 | 2 | 3 | 4;

export interface CheckoutShippingValidationInput {
  itemsCount: number;
  shippingOptionsCount: number;
  selectedShipping: string;
  isNationalCarrierSelected: boolean;
  shippingBranchCode: string | null;
  isLocalDeliverySelected: boolean;
  hasDeliveryZones: boolean;
  deliveryZoneId: string | null;
  meetingPointId: string | null;
  deliveryAddress: string;
  isPickupSelected: boolean;
  hasPickupPoints: boolean;
  pickupPointId: string | null;
}

/** @deprecated Prefer `CheckoutShippingValidationInput`. */
export type CheckoutStep1ValidationInput = CheckoutShippingValidationInput;

export interface CheckoutCustomerValidationInput {
  itemsCount: number;
  hasCustomerProfile: boolean;
  customerName: string;
  customerPhone: string;
}

export interface CheckoutPaymentValidationInput {
  itemsCount: number;
  paymentsCount: number;
  selectedPayment: string;
  hasProofFile: boolean;
  /** Si true, el comprobante es obligatorio. Por defecto / en checkout: false (opcional). */
  requiresProofFile?: boolean;
}

export interface CheckoutStep2ValidationInput
  extends CheckoutCustomerValidationInput,
    CheckoutPaymentValidationInput {
  shippingOptionsCount: number;
  selectedShipping: string;
}

export interface CheckoutValidationResult {
  errors: Partial<Record<CheckoutFieldKey, string>>;
  isValid: boolean;
  firstErrorField: CheckoutFieldKey | null;
}

const CART_FIELD_ORDER: CheckoutFieldKey[] = ["cart"];

const CUSTOMER_FIELD_ORDER: CheckoutFieldKey[] = [
  "customerName",
  "customerPhone",
];

const SHIPPING_FIELD_ORDER: CheckoutFieldKey[] = [
  "shipping",
  "shippingBranch",
  "deliveryZone",
  "meetingPoint",
  "deliveryAddress",
  "pickupPoint",
];

const PAYMENT_FIELD_ORDER: CheckoutFieldKey[] = ["payment", "proofFile"];

const STEP2_FIELD_ORDER: CheckoutFieldKey[] = [
  ...CUSTOMER_FIELD_ORDER,
  ...PAYMENT_FIELD_ORDER,
  "shipping",
];

const ONE_PAGE_FIELD_ORDER: CheckoutFieldKey[] = [
  ...CUSTOMER_FIELD_ORDER,
  ...SHIPPING_FIELD_ORDER,
  ...PAYMENT_FIELD_ORDER,
];

function buildResult(
  errors: Partial<Record<CheckoutFieldKey, string>>,
  fieldOrder: CheckoutFieldKey[],
): CheckoutValidationResult {
  const firstErrorField =
    fieldOrder.find((field) => Boolean(errors[field])) ?? null;
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    firstErrorField,
  };
}

export function validateCheckoutCartStep(itemsCount: number): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};
  if (itemsCount === 0) {
    errors.cart = "Añade al menos un producto para continuar.";
  }
  return buildResult(errors, CART_FIELD_ORDER);
}

export function validateCheckoutCustomerStep(
  input: CheckoutCustomerValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (input.itemsCount === 0) {
    errors.cart = "Añade al menos un producto para continuar.";
    return buildResult(errors, ["cart", ...CUSTOMER_FIELD_ORDER]);
  }

  if (!input.hasCustomerProfile) {
    if (input.customerName.trim().length < 2) {
      errors.customerName = "Ingresa tu nombre para continuar.";
    }
    if (!isValidCustomerPhone(input.customerPhone)) {
      errors.customerPhone =
        input.customerPhone.trim().length === 0
          ? "Ingresa tu teléfono / WhatsApp para continuar."
          : "Indica un teléfono o WhatsApp válido (ej. 0412… o 412…).";
    }
  }

  return buildResult(errors, CUSTOMER_FIELD_ORDER);
}

export function validateCheckoutShippingStep(
  input: CheckoutShippingValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (input.itemsCount === 0) {
    return buildResult(errors, SHIPPING_FIELD_ORDER);
  }

  if (input.shippingOptionsCount > 0 && !input.selectedShipping) {
    errors.shipping = "Selecciona un método de envío para continuar.";
  }

  // Sucursal de agencia (MRW/Zoom/etc.): opcional; se puede coordinar luego por WhatsApp.

  if (input.isLocalDeliverySelected) {
    if (input.hasDeliveryZones) {
      if (!input.deliveryZoneId) {
        errors.deliveryZone = "Selecciona la zona de entrega.";
      }
      if (!input.meetingPointId) {
        errors.meetingPoint = "Selecciona el punto de encuentro.";
      }
    }
    // Dirección libre: opcional (se puede acordar por WhatsApp).
  }

  if (
    input.isPickupSelected &&
    input.hasPickupPoints &&
    !input.pickupPointId
  ) {
    errors.pickupPoint = "Selecciona el punto de retiro.";
  }

  return buildResult(errors, SHIPPING_FIELD_ORDER);
}

export function validateCheckoutPaymentStep(
  input: CheckoutPaymentValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (input.itemsCount === 0) {
    return buildResult(errors, PAYMENT_FIELD_ORDER);
  }

  if (input.paymentsCount > 0 && !input.selectedPayment) {
    errors.payment = "Selecciona un método de pago para continuar.";
  }

  if (input.requiresProofFile && !input.hasProofFile) {
    errors.proofFile = "Adjunta el comprobante de pago.";
  }

  return buildResult(errors, PAYMENT_FIELD_ORDER);
}

/** @deprecated Prefer `validateCheckoutShippingStep`. */
export function validateCheckoutStep1(
  input: CheckoutShippingValidationInput,
): CheckoutValidationResult {
  return validateCheckoutShippingStep(input);
}

/** @deprecated Prefer customer + payment step validators. */
export function validateCheckoutStep2(
  input: CheckoutStep2ValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {
    ...validateCheckoutCustomerStep(input).errors,
    ...validateCheckoutPaymentStep(input).errors,
  };

  if (input.shippingOptionsCount > 0 && !input.selectedShipping) {
    errors.shipping = "Selecciona un método de envío.";
  }

  return buildResult(errors, STEP2_FIELD_ORDER);
}

/** Validación unificada para checkout de una sola página. */
export function validateOnePageCheckout(
  shipping: CheckoutShippingValidationInput,
  rest: CheckoutStep2ValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {
    ...validateCheckoutShippingStep(shipping).errors,
    ...validateCheckoutStep2(rest).errors,
  };
  return buildResult(errors, ONE_PAGE_FIELD_ORDER);
}

export function validateProgressiveCheckoutStep(
  step: ProgressiveCheckoutStep,
  input: {
    itemsCount: number;
    customer: CheckoutCustomerValidationInput;
    shipping: CheckoutShippingValidationInput;
    payment: CheckoutPaymentValidationInput;
  },
): CheckoutValidationResult {
  switch (step) {
    case 1:
      return validateCheckoutCartStep(input.itemsCount);
    case 2:
      return validateCheckoutCustomerStep(input.customer);
    case 3:
      return validateCheckoutShippingStep(input.shipping);
    case 4:
      return validateCheckoutPaymentStep(input.payment);
    default:
      return buildResult({}, CART_FIELD_ORDER);
  }
}

export function summarizeCheckoutValidation(
  result: CheckoutValidationResult,
): string | null {
  if (result.isValid) return null;
  const messages = Object.values(result.errors).filter(Boolean);
  if (messages.length === 0) return "Completa los campos obligatorios.";
  if (messages.length === 1) return messages[0] ?? null;
  return "Completa los campos obligatorios marcados en rojo.";
}
