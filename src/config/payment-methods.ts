import type { PaymentMethodKey } from "@/lib/store-settings/types";

export type PaymentMethodFieldType = "text" | "qr-image";

export interface PaymentMethodFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  fullWidth?: boolean;
  type?: PaymentMethodFieldType;
  /** Muestra botón «Copiar» en el checkout del catálogo. */
  copyable?: boolean;
  /** Campo opcional aunque el método esté activo. */
  optional?: boolean;
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
      {
        key: "phone",
        label: "Teléfono",
        placeholder: "Ej: 0414-1234567",
        copyable: true,
      },
      {
        key: "ci",
        label: "Cédula / RIF",
        placeholder: "Ej: V-12.345.678",
        copyable: true,
      },
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
      {
        key: "account",
        label: "Número de cuenta",
        placeholder: "0105-...",
        copyable: true,
      },
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
      {
        key: "email",
        label: "Correo Zelle",
        placeholder: "tu@email.com",
        copyable: true,
      },
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
        optional: true,
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
        copyable: true,
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
        copyable: true,
      },
      {
        key: "note",
        label: "Nota (opcional)",
        placeholder: "Ej: Solo USDT en red BEP20",
        fullWidth: true,
        optional: true,
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
        copyable: true,
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
        copyable: true,
      },
    ],
  },
  {
    key: "pse",
    label: "PSE",
    description: "Pagos seguros en línea desde cuenta bancaria (Colombia).",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Ej: Bancolombia" },
      {
        key: "commerceCode",
        label: "Código de comercio PSE",
        placeholder: "Código asignado por tu pasarela",
        copyable: true,
      },
    ],
  },
  {
    key: "tarjetas",
    label: "Tarjetas (Crédito/Débito)",
    description: "Acepta tarjetas nacionales e internacionales.",
    fields: [
      {
        key: "note",
        label: "Nota para el cliente",
        placeholder: "Ej: Visa, Mastercard, Amex",
        fullWidth: true,
        optional: true,
      },
    ],
  },
  {
    key: "nequi",
    label: "Nequi",
    description: "Cobra con tu número o llave Nequi.",
    fields: [
      {
        key: "phone",
        label: "Número Nequi",
        placeholder: "Ej: 300 123 4567",
        copyable: true,
      },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Nombre del titular",
      },
    ],
  },
  {
    key: "daviplata",
    label: "Daviplata",
    description: "Recibe pagos con Daviplata.",
    fields: [
      {
        key: "phone",
        label: "Número Daviplata",
        placeholder: "Ej: 300 987 6543",
        copyable: true,
      },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Nombre del titular",
      },
    ],
  },
  {
    key: "efectyBaloto",
    label: "Efecty / Baloto",
    description: "Cobros en corresponsales y puntos de recaudo.",
    fields: [
      {
        key: "agreementCode",
        label: "Convenio / referencia",
        placeholder: "Número de convenio o referencia",
        copyable: true,
      },
      {
        key: "note",
        label: "Instrucciones (opcional)",
        placeholder: "Ej: Presentar referencia en Efecty o Baloto",
        fullWidth: true,
        optional: true,
      },
    ],
  },
  {
    key: "mercadoPago",
    label: "Mercado Pago",
    description: "Cobra con tu cuenta o link de Mercado Pago.",
    fields: [
      {
        key: "alias",
        label: "Alias / CVU Mercado Pago",
        placeholder: "Ej: tu.tienda.mp",
        copyable: true,
      },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Nombre del titular",
      },
    ],
  },
  {
    key: "transferenciaCbu",
    label: "Transferencia Bancaria (CBU/CVU)",
    description: "Recibe transferencias desde cualquier banco argentino.",
    fields: [
      {
        key: "cbu",
        label: "CBU",
        placeholder: "22 dígitos",
        copyable: true,
      },
      {
        key: "cvu",
        label: "CVU (opcional)",
        placeholder: "Si usas billetera virtual",
        copyable: true,
        optional: true,
      },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Razón social o nombre",
      },
      {
        key: "bank",
        label: "Banco",
        placeholder: "Ej: Banco Galicia",
      },
    ],
  },
  {
    key: "tarjetasAr",
    label: "Tarjetas (Visa/Master/Cabal/Naranja)",
    description: "Acepta tarjetas de crédito y débito argentinas.",
    fields: [
      {
        key: "note",
        label: "Nota para el cliente",
        placeholder: "Ej: Visa, Mastercard, Cabal, Naranja",
        fullWidth: true,
        optional: true,
      },
    ],
  },
  {
    key: "pagoFacilRapipago",
    label: "Efectivo (Pago Fácil/Rapipago)",
    description: "Cobros en efectivo en redes Pago Fácil y Rapipago.",
    fields: [
      {
        key: "agreementCode",
        label: "Código de barras / convenio",
        placeholder: "Referencia para el cliente",
        copyable: true,
      },
      {
        key: "note",
        label: "Instrucciones (opcional)",
        placeholder: "Ej: Presentar DNI al pagar",
        fullWidth: true,
        optional: true,
      },
    ],
  },
  {
    key: "billeterasDigitales",
    label: "Billeteras Digitales (Ualá/MODO/Cuenta DNI)",
    description: "Recibe pagos desde billeteras virtuales argentinas.",
    fields: [
      {
        key: "uala",
        label: "Ualá (alias o CVU)",
        placeholder: "Ej: mi.tienda.uala",
        copyable: true,
        optional: true,
      },
      {
        key: "modo",
        label: "MODO (alias o CVU)",
        placeholder: "Ej: tienda.modo",
        copyable: true,
        optional: true,
      },
      {
        key: "cuentaDni",
        label: "Cuenta DNI (opcional)",
        placeholder: "Referencia Cuenta DNI",
        copyable: true,
        optional: true,
      },
      {
        key: "holder",
        label: "Titular",
        placeholder: "Nombre del titular",
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

/** Grupos de métodos de pago para tiendas en Colombia (misma estructura de secciones). */
export const COLOMBIA_PAYMENT_METHOD_GROUPS: PaymentMethodGroupDefinition[] = [
  {
    title: "Pagos en línea",
    description: "Métodos bancarios y tarjetas en Colombia.",
    keys: ["pse", "tarjetas"],
  },
  {
    title: "Billeteras y corresponsales",
    description: "Nequi, Daviplata y puntos Efecty/Baloto.",
    keys: ["nequi", "daviplata", "efectyBaloto"],
  },
];

/** Grupos de métodos de pago para tiendas en Argentina (misma estructura de secciones). */
export const ARGENTINA_PAYMENT_METHOD_GROUPS: PaymentMethodGroupDefinition[] = [
  {
    title: "Pagos digitales",
    description: "Mercado Pago, transferencias y tarjetas en Argentina.",
    keys: ["mercadoPago", "transferenciaCbu", "tarjetasAr"],
  },
  {
    title: "Efectivo y billeteras",
    description: "Pago Fácil, Rapipago y billeteras Ualá, MODO y Cuenta DNI.",
    keys: ["pagoFacilRapipago", "billeterasDigitales"],
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
