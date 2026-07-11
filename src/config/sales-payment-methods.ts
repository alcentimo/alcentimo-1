export type SalesPaymentMethodKey =
  | "efectivo"
  | "transferencia"
  | "pago_movil"
  | "divisa"
  | "zelle"
  | "punto_venta"
  | "otro";

export interface SalesPaymentMethodDefinition {
  key: SalesPaymentMethodKey;
  label: string;
  /** Valor persistido en ventas.metodo_pago */
  dbValue: string;
}

export const SALES_PAYMENT_METHODS: SalesPaymentMethodDefinition[] = [
  { key: "efectivo", label: "Efectivo", dbValue: "Efectivo" },
  {
    key: "transferencia",
    label: "Transferencia",
    dbValue: "Transferencia",
  },
  { key: "pago_movil", label: "Pago Móvil", dbValue: "Pago Movil" },
  { key: "divisa", label: "Divisa (USD)", dbValue: "Divisa" },
  { key: "zelle", label: "Zelle", dbValue: "Zelle" },
  { key: "punto_venta", label: "Punto de venta", dbValue: "Punto de Venta" },
  { key: "otro", label: "Otro", dbValue: "Otro" },
];

export const SALES_PAYMENT_BY_KEY = Object.fromEntries(
  SALES_PAYMENT_METHODS.map((method) => [method.key, method]),
) as Record<SalesPaymentMethodKey, SalesPaymentMethodDefinition>;

export const SALES_PAYMENT_DB_VALUES = new Set(
  SALES_PAYMENT_METHODS.map((method) => method.dbValue),
);

export function getSalesPaymentMethod(
  key: SalesPaymentMethodKey,
): SalesPaymentMethodDefinition {
  return SALES_PAYMENT_BY_KEY[key];
}

export function isValidSalesPaymentDbValue(value: string): boolean {
  return SALES_PAYMENT_DB_VALUES.has(value);
}
