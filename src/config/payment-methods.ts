import type { PaymentMethodKey } from "@/lib/store-settings/types";

export interface PaymentMethodFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  fullWidth?: boolean;
}

export interface PaymentMethodDefinition {
  key: PaymentMethodKey;
  label: string;
  description: string;
  fields: PaymentMethodFieldDefinition[];
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
