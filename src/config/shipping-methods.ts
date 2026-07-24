import type { ShippingCarrierKey } from "@/lib/store-settings/types";

export interface ShippingMethodDefinition {
  key: ShippingCarrierKey;
  label: string;
  description: string;
  estimatedTime?: string;
  category: "carrier" | "local";
}

/** Catálogo centralizado de métodos de envío (Venezuela). */
export const SHIPPING_METHODS: ShippingMethodDefinition[] = [
  {
    key: "mrw",
    label: "MRW",
    description: "Envíos por agencia MRW a nivel nacional.",
    estimatedTime: "2–5 días hábiles",
    category: "carrier",
  },
  {
    key: "tealca",
    label: "Tealca",
    description: "Cobertura vía Tealca en ciudades principales.",
    estimatedTime: "2–4 días hábiles",
    category: "carrier",
  },
  {
    key: "zoom",
    label: "Zoom",
    description: "Entregas con Zoom Delivery o agencia aliada.",
    estimatedTime: "1–3 días hábiles",
    category: "carrier",
  },
  {
    key: "domesa",
    label: "Domesa",
    description: "Opción de encomienda Domesa para tu catálogo.",
    estimatedTime: "3–6 días hábiles",
    category: "carrier",
  },
  {
    key: "libertyExpress",
    label: "Liberty Express",
    description: "Envíos express con cobertura nacional.",
    estimatedTime: "1–4 días hábiles",
    category: "carrier",
  },
  {
    key: "delivery",
    label: "Entrega personalizada",
    description: "Entregas en zonas o puntos de encuentro que tú defines.",
    estimatedTime: "Coordinar contigo",
    category: "local",
  },
  {
    key: "pickup",
    label: "Punto de encuentro",
    description: "El cliente retira en un lugar acordado, sin tienda física.",
    estimatedTime: "Coordinar horario",
    category: "local",
  },
];

export const SHIPPING_METHOD_BY_KEY: Record<
  ShippingCarrierKey,
  ShippingMethodDefinition
> = Object.fromEntries(
  SHIPPING_METHODS.map((method) => [method.key, method]),
) as Record<ShippingCarrierKey, ShippingMethodDefinition>;

export function getShippingMethod(
  key: ShippingCarrierKey,
): ShippingMethodDefinition {
  return SHIPPING_METHOD_BY_KEY[key];
}

export const NATIONAL_CARRIER_METHODS = SHIPPING_METHODS.filter(
  (method) => method.category === "carrier",
);

export const LOCAL_SHIPPING_METHODS = SHIPPING_METHODS.filter(
  (method) => method.category === "local",
);

const NATIONAL_CARRIER_KEY_SET = new Set(
  NATIONAL_CARRIER_METHODS.map((method) => method.key),
);

export function isNationalCarrierKey(
  key: string | null | undefined,
): key is ShippingCarrierKey {
  if (!key) return false;
  return NATIONAL_CARRIER_KEY_SET.has(key as ShippingCarrierKey);
}
