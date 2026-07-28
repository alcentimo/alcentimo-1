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
  | "proofFile";

export interface CheckoutStep1ValidationInput {
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

export interface CheckoutStep2ValidationInput {
  itemsCount: number;
  hasCustomerProfile: boolean;
  customerName: string;
  customerPhone: string;
  shippingOptionsCount: number;
  selectedShipping: string;
  paymentsCount: number;
  selectedPayment: string;
  hasProofFile: boolean;
}

export interface CheckoutValidationResult {
  errors: Partial<Record<CheckoutFieldKey, string>>;
  isValid: boolean;
  firstErrorField: CheckoutFieldKey | null;
}

const STEP1_FIELD_ORDER: CheckoutFieldKey[] = [
  "shipping",
  "shippingBranch",
  "deliveryZone",
  "meetingPoint",
  "deliveryAddress",
  "pickupPoint",
];

const STEP2_FIELD_ORDER: CheckoutFieldKey[] = [
  "payment",
  "customerName",
  "customerPhone",
  "proofFile",
  "shipping",
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

export function validateCheckoutStep1(
  input: CheckoutStep1ValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (input.itemsCount === 0) {
    return buildResult(errors, STEP1_FIELD_ORDER);
  }

  if (input.shippingOptionsCount > 0 && !input.selectedShipping) {
    errors.shipping = "Selecciona un método de envío para continuar.";
  }

  if (input.isNationalCarrierSelected && !input.shippingBranchCode) {
    errors.shippingBranch = "Selecciona la sucursal de destino de la agencia.";
  }

  if (input.isLocalDeliverySelected) {
    if (input.hasDeliveryZones) {
      if (!input.deliveryZoneId) {
        errors.deliveryZone = "Selecciona la zona de entrega.";
      }
      if (!input.meetingPointId) {
        errors.meetingPoint = "Selecciona el punto de encuentro.";
      }
    } else if (input.deliveryAddress.trim().length < 8) {
      errors.deliveryAddress =
        "Indica tu dirección de entrega (mínimo 8 caracteres).";
    }
  }

  if (
    input.isPickupSelected &&
    input.hasPickupPoints &&
    !input.pickupPointId
  ) {
    errors.pickupPoint = "Selecciona el punto de retiro.";
  }

  return buildResult(errors, STEP1_FIELD_ORDER);
}

export function validateCheckoutStep2(
  input: CheckoutStep2ValidationInput,
): CheckoutValidationResult {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (input.itemsCount === 0) {
    return buildResult(errors, STEP2_FIELD_ORDER);
  }

  if (!input.hasCustomerProfile) {
    if (input.customerName.trim().length < 2) {
      errors.customerName = "Indica tu nombre (mínimo 2 caracteres).";
    }
    const phoneDigits = input.customerPhone.replace(/\D/g, "").length;
    if (phoneDigits < 10) {
      errors.customerPhone =
        "Indica un teléfono o WhatsApp válido (mínimo 10 dígitos).";
    }
  }

  if (input.paymentsCount > 0 && !input.selectedPayment) {
    errors.payment = "Selecciona un método de pago.";
  }

  if (!input.hasProofFile) {
    errors.proofFile = "Adjunta el comprobante de pago.";
  }

  if (input.shippingOptionsCount > 0 && !input.selectedShipping) {
    errors.shipping = "Selecciona un método de envío.";
  }

  return buildResult(errors, STEP2_FIELD_ORDER);
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
