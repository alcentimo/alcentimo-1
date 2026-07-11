import type { PaymentMethodKey } from "@/lib/store-settings/types";

export type PaymentMethodFieldType = "text" | "qr-image";

export interface PaymentMethodFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  fullWidth?: boolean;
  type?: PaymentMethodFieldType;
}

export interface PaymentMethodDefinition {
  key: PaymentMethodKey;
  label: string;
  description: string;
  fields: PaymentMethodFieldDefinition[];
}

export interface PaymentMethodGroupDefinition {
  title: string;
  description?: string;
  keys: PaymentMethodKey[];
}

/** Catálogo centralizado de métodos de pago. */
export const PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    key: "pagoMovil",
    label: "Pago Móvil",
    description: "Cobra en bolívares vía Pago Móvil bancario.",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Ej: Banesco" },
      { key: "phone", label: "Teléfono", placeholder: "Ej: 0414-1234567" },
      { key: "ci", label: "Cédula / RIF", placeholder: "Ej: V-12.345.678" },
      {
        key: "qrImageUrl",
        label: "Código QR del banco",
        placeholder: "",
        type: "qr-image",
        fullWidth: true,
      },
    ],
  },
  {
    key: "transferencia",
    label: "Transferencia bancaria",
    description: "Transferencia directa a cuenta nacional.",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Ej: Mercantil" },
      { key: "account", label: "Número de cuenta", placeholder: "0105-..." },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Razón social o nombre",
      },
    ],
  },
  {
    key: "zelle",
    label: "Zelle",
    description: "Recibe pagos en USD por Zelle.",
    fields: [
      { key: "email", label: "Correo Zelle", placeholder: "tu@email.com" },
      { key: "holder", label: "Titular", placeholder: "Nombre del titular" },
    ],
  },
  {
    key: "efectivoUsd",
    label: "Efectivo USD",
    description: "Acepta dólares en efectivo al entregar.",
    fields: [],
  },
  {
    key: "puntoVenta",
    label: "Punto de venta",
    description: "Tarjeta débito/crédito en tu local.",
    fields: [
      {
        key: "note",
        label: "Nota para el cliente",
        placeholder: "Ej: Solo tarjetas nacionales",
        fullWidth: true,
      },
    ],
  },
  {
    key: "paypal",
    label: "PayPal",
    description: "Recibe pagos internacionales con PayPal.",
    fields: [
      {
        key: "email",
        label: "Correo de PayPal",
        placeholder: "pagos@tutienda.com",
        fullWidth: true,
      },
    ],
  },
  {
    key: "binance",
    label: "Binance Pay",
    description: "Cobra con Binance Pay ID o Pay ID.",
    fields: [
      {
        key: "payId",
        label: "Binance Pay ID / Pay ID",
        placeholder: "Ej: 123456789",
        fullWidth: true,
      },
      {
        key: "note",
        label: "Nota (opcional)",
        placeholder: "Ej: Solo USDT en red BEP20",
        fullWidth: true,
      },
    ],
  },
  {
    key: "crypto",
    label: "Criptomonedas",
    description: "Acepta pagos en cripto (BTC, USDT, etc.).",
    fields: [
      {
        key: "walletAddress",
        label: "Dirección de billetera",
        placeholder: "0x… o dirección de tu wallet",
        fullWidth: true,
      },
      {
        key: "network",
        label: "Red / moneda",
        placeholder: "Ej: USDT · TRC20",
        fullWidth: true,
      },
    ],
  },
  {
    key: "cashea",
    label: "Cashea",
    description: "Permite compras con financiamiento Cashea.",
    fields: [
      {
        key: "merchantId",
        label: "ID comercio",
        placeholder: "ID asignado por Cashea",
      },
    ],
  },
];

export const PAYMENT_METHOD_GROUPS: PaymentMethodGroupDefinition[] = [
  {
    title: "Banca y efectivo",
    description: "Métodos tradicionales en Venezuela.",
    keys: [
      "pagoMovil",
      "transferencia",
      "zelle",
      "efectivoUsd",
      "puntoVenta",
    ],
  },
  {
    title: "Pagos digitales",
    description: "PayPal, Binance y criptomonedas.",
    keys: ["paypal", "binance", "crypto"],
  },
  {
    title: "Financiamiento",
    keys: ["cashea"],
  },
];

export const PAYMENT_METHOD_BY_KEY: Record<
  PaymentMethodKey,
  PaymentMethodDefinition
> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.key, method]),
) as Record<PaymentMethodKey, PaymentMethodDefinition>;

export function getPaymentMethod(key: PaymentMethodKey): PaymentMethodDefinition {
  return PAYMENT_METHOD_BY_KEY[key];
}
