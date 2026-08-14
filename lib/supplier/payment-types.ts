import type { PaymentMethodKey } from "@/lib/store-settings/types";

/** Métodos B2B soportados para pago directo al proveedor. */
export const SUPPLIER_B2B_PAYMENT_METHOD_KEYS = [
  "pagoMovil",
  "transferencia",
  "zelle",
] as const satisfies readonly PaymentMethodKey[];

export type SupplierB2bPaymentMethodKey =
  (typeof SUPPLIER_B2B_PAYMENT_METHOD_KEYS)[number];

export interface SupplierPaymentMethodConfig {
  enabled: boolean;
  fields: Record<string, string>;
}

export interface SupplierPaymentConfig {
  methods: Record<SupplierB2bPaymentMethodKey, SupplierPaymentMethodConfig>;
  /** Instrucciones libres (cuenta, horarios, notas). */
  instructions: string;
  /** WhatsApp del proveedor para notificar pagos B2B. */
  whatsappPhone: string;
}

export const SUPPLIER_ORDER_PAYMENT_STATUSES = [
  "pendiente",
  "reportado",
  "confirmado",
] as const;

export type SupplierOrderPaymentStatus =
  (typeof SUPPLIER_ORDER_PAYMENT_STATUSES)[number];

export const SUPPLIER_ORDER_PAYMENT_STATUS_LABELS: Record<
  SupplierOrderPaymentStatus,
  string
> = {
  pendiente: "Pago pendiente",
  reportado: "Pago reportado",
  confirmado: "Pago confirmado",
};

export function isSupplierOrderPaymentStatus(
  value: unknown,
): value is SupplierOrderPaymentStatus {
  return (
    value === "pendiente" ||
    value === "reportado" ||
    value === "confirmado"
  );
}

export function isSupplierB2bPaymentMethodKey(
  value: unknown,
): value is SupplierB2bPaymentMethodKey {
  return (
    value === "pagoMovil" ||
    value === "transferencia" ||
    value === "zelle"
  );
}

export function defaultSupplierPaymentConfig(): SupplierPaymentConfig {
  return {
    methods: {
      pagoMovil: { enabled: false, fields: {} },
      transferencia: { enabled: false, fields: {} },
      zelle: { enabled: false, fields: {} },
    },
    instructions: "",
    whatsappPhone: "",
  };
}

export function normalizeSupplierPaymentConfig(
  raw: unknown,
): SupplierPaymentConfig {
  const defaults = defaultSupplierPaymentConfig();
  if (!raw || typeof raw !== "object") return defaults;

  const input = raw as Record<string, unknown>;
  const methodsRaw =
    input.methods && typeof input.methods === "object"
      ? (input.methods as Record<string, unknown>)
      : {};

  const methods = { ...defaults.methods };
  for (const key of SUPPLIER_B2B_PAYMENT_METHOD_KEYS) {
    const entry = methodsRaw[key];
    if (!entry || typeof entry !== "object") continue;
    const method = entry as Record<string, unknown>;
    const fieldsRaw =
      method.fields && typeof method.fields === "object"
        ? (method.fields as Record<string, unknown>)
        : {};
    const fields: Record<string, string> = {};
    for (const [fieldKey, fieldValue] of Object.entries(fieldsRaw)) {
      if (typeof fieldValue === "string") {
        fields[fieldKey] = fieldValue;
      }
    }
    methods[key] = {
      enabled: method.enabled === true,
      fields,
    };
  }

  return {
    methods,
    instructions:
      typeof input.instructions === "string" ? input.instructions.trim() : "",
    whatsappPhone:
      typeof input.whatsappPhone === "string"
        ? input.whatsappPhone.trim()
        : "",
  };
}

export function supplierPaymentConfigHasEnabledMethod(
  config: SupplierPaymentConfig,
): boolean {
  return SUPPLIER_B2B_PAYMENT_METHOD_KEYS.some(
    (key) => config.methods[key]?.enabled,
  );
}

export const DROPSHIP_NO_INTERMEDIATION_NOTICE =
  "Alcéntimo no procesa, retiene ni intermedia estos fondos. El pago del costo base va directo del emprendedor al proveedor.";
