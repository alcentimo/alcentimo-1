export type SalesPaymentMethodKey =
  | "efectivo"
  | "transferencia"
  | "pago_movil"
  | "divisa"
  | "zelle"
  | "punto_venta"
  | "pse"
  | "nequi"
  | "daviplata"
  | "efecty_baloto"
  | "mercado_pago"
  | "tarjeta"
  | "otro";

/** Identificador de logo compartido con PaymentMethodLogo / PaymentBrandMarks. */
export type SalesPaymentLogoKey =
  | "efectivo"
  | "transferencia"
  | "pago_movil"
  | "divisa"
  | "zelle"
  | "punto_venta"
  | "pse"
  | "tarjetas"
  | "nequi"
  | "daviplata"
  | "efectyBaloto"
  | "mercado_pago"
  | "otro";

export interface SalesPaymentMethodDefinition {
  key: SalesPaymentMethodKey;
  label: string;
  /** Valor persistido en ventas.metodo_pago */
  dbValue: string;
  /** Logo unificado (mismo estilo que ajustes de pagos). */
  logoKey?: SalesPaymentLogoKey;
}

export const SALES_PAYMENT_METHODS: SalesPaymentMethodDefinition[] = [
  { key: "efectivo", label: "Efectivo", dbValue: "Efectivo", logoKey: "efectivo" },
  {
    key: "transferencia",
    label: "Transferencia",
    dbValue: "Transferencia",
    logoKey: "transferencia",
  },
  {
    key: "pago_movil",
    label: "Pago Móvil",
    dbValue: "Pago Movil",
    logoKey: "pago_movil",
  },
  { key: "divisa", label: "Divisa (USD)", dbValue: "Divisa", logoKey: "divisa" },
  { key: "zelle", label: "Zelle", dbValue: "Zelle", logoKey: "zelle" },
  {
    key: "punto_venta",
    label: "Punto de venta",
    dbValue: "Punto de Venta",
    logoKey: "punto_venta",
  },
  { key: "pse", label: "PSE", dbValue: "PSE", logoKey: "pse" },
  {
    key: "tarjeta",
    label: "Tarjetas (Crédito/Débito)",
    dbValue: "Tarjeta",
    logoKey: "tarjetas",
  },
  { key: "nequi", label: "Nequi", dbValue: "Nequi", logoKey: "nequi" },
  {
    key: "daviplata",
    label: "Daviplata",
    dbValue: "Daviplata",
    logoKey: "daviplata",
  },
  {
    key: "efecty_baloto",
    label: "Efecty / Baloto",
    dbValue: "Efecty / Baloto",
    logoKey: "efectyBaloto",
  },
  {
    key: "mercado_pago",
    label: "Mercado Pago",
    dbValue: "Mercado Pago",
    logoKey: "mercado_pago",
  },
  { key: "otro", label: "Otro", dbValue: "Otro", logoKey: "otro" },
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
