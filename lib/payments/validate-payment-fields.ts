import type { PaymentMethodKey, PaymentsSettings } from "@/lib/store-settings/types";
import { getPaymentMethod, PAYMENT_METHODS } from "@/src/config/payment-methods";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CRYPTO_WALLET_RE = /^[a-zA-Z0-9._:-]{20,128}$/;
const BINANCE_PAY_ID_RE = /^[a-zA-Z0-9._-]{6,64}$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

export type PaymentFieldErrors = Record<string, string>;

function fieldErrorKey(methodKey: PaymentMethodKey, fieldKey: string): string {
  return `${methodKey}.${fieldKey}`;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El correo es obligatorio.";
  if (!EMAIL_RE.test(trimmed)) return "Ingresa un correo electrónico válido.";
  return null;
}

export function validateCryptoWallet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "La dirección de billetera es obligatoria.";
  if (trimmed.length < 20) {
    return "La dirección debe tener al menos 20 caracteres.";
  }
  if (!CRYPTO_WALLET_RE.test(trimmed)) {
    return "Usa solo letras, números y los símbolos . _ : -";
  }
  return null;
}

export function validateBinancePayId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El Pay ID de Binance es obligatorio.";
  if (!BINANCE_PAY_ID_RE.test(trimmed)) {
    return "El Pay ID debe tener entre 6 y 64 caracteres alfanuméricos.";
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El teléfono es obligatorio.";
  if (!PHONE_RE.test(trimmed)) return "Ingresa un número de teléfono válido.";
  return null;
}

export function validateRequiredText(
  value: string,
  label: string,
): string | null {
  if (!value.trim()) return `${label} es obligatorio.`;
  return null;
}

function validateField(
  methodKey: PaymentMethodKey,
  fieldKey: string,
  value: string,
  label: string,
): string | null {
  if (fieldKey === "email" && (methodKey === "paypal" || methodKey === "zelle")) {
    return validateEmail(value);
  }
  if (fieldKey === "walletAddress" && methodKey === "crypto") {
    return validateCryptoWallet(value);
  }
  if (fieldKey === "payId" && methodKey === "binance") {
    return validateBinancePayId(value);
  }
  if (fieldKey === "phone" && methodKey === "pagoMovil") {
    return validatePhone(value);
  }
  if (
    fieldKey === "network" &&
    methodKey === "crypto"
  ) {
    return validateRequiredText(value, label);
  }
  if (
    ["bank", "ci", "account", "holder", "merchantId"].includes(fieldKey)
  ) {
    return validateRequiredText(value, label);
  }
  return null;
}

/** Valida métodos habilitados antes de guardar configuración de pagos. */
export function validatePaymentsSettings(
  payments: PaymentsSettings,
): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {};

  for (const method of PAYMENT_METHODS) {
    const config = payments.methods[method.key];
    if (!config?.enabled) continue;

    for (const field of method.fields) {
      if (field.type === "qr-image") continue;

      const value = config.fields[field.key] ?? "";
      if (field.optional && !value.trim()) continue;

      const error = validateField(method.key, field.key, value, field.label);
      if (error) {
        errors[fieldErrorKey(method.key, field.key)] = error;
      }
    }
  }

  return errors;
}

export function getFirstPaymentValidationError(
  errors: PaymentFieldErrors,
): string | null {
  const values = Object.values(errors);
  return values[0] ?? null;
}

export function validateSinglePaymentField(
  methodKey: PaymentMethodKey,
  fieldKey: string,
  value: string,
  enabled: boolean,
): string | null {
  if (!enabled) return null;

  const method = getPaymentMethod(methodKey);
  const field = method.fields.find((item) => item.key === fieldKey);
  if (!field || field.type === "qr-image") return null;
  if (field.optional && !value.trim()) return null;

  return validateField(methodKey, fieldKey, value, field.label);
}
