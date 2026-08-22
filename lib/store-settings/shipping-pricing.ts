import { formatUsd } from "@/lib/format";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import type {
  ShippingCarrierKey,
  ShippingPricingMode,
  ShippingSettings,
} from "@/lib/store-settings/types";

/** Texto de checkout cuando el envío nacional sale gratis. */
export const FREE_SHIPPING_VE_LABEL = "Envío gratis a toda Venezuela";

/** Micro-copy de confianza bajo agencias nacionales (MRW / Zoom). */
export const NATIONAL_SHIPPING_TRUST_COPY =
  "Envíos asegurados y rastreables a toda Venezuela.";

export interface ShippingPricingPublicConfig {
  mode: ShippingPricingMode;
  flatRateUsd: number;
  freeShippingEnabled: boolean;
  freeShippingMinUsd: number;
}

export interface ShippingQuoteInput {
  pricing: ShippingPricingPublicConfig | Pick<
    ShippingSettings,
    | "pricingMode"
    | "flatRateUsd"
    | "freeShippingEnabled"
    | "freeShippingMinUsd"
  >;
  method: ShippingCarrierKey | string | null | undefined;
  /** Subtotal de productos (tras descuentos), sin envío. */
  merchandiseUsd: number;
}

export interface ShippingQuote {
  /** Monto a sumar al total del pedido (0 en COD o gratis). */
  chargeUsd: number;
  /** Texto corto para totales: "$0.00", "Cobro a destino", "$3.00". */
  chargeLabel: string;
  /** Resumen amigable con la modalidad. */
  summaryLabel: string;
  isFree: boolean;
  isCod: boolean;
  appliesPaidShipping: boolean;
  freeShipping: {
    enabled: boolean;
    /** true cuando minUsd === 0 (siempre gratis si está activo). */
    always: boolean;
    minUsd: number;
    unlocked: boolean;
    remainingUsd: number;
  };
}

function readPricing(
  pricing: ShippingQuoteInput["pricing"],
): ShippingPricingPublicConfig {
  if ("mode" in pricing) {
    return pricing;
  }
  return {
    mode: pricing.pricingMode,
    flatRateUsd: pricing.flatRateUsd,
    freeShippingEnabled: pricing.freeShippingEnabled,
    freeShippingMinUsd: pricing.freeShippingMinUsd,
  };
}

export function toShippingPricingPublicConfig(
  shipping: ShippingSettings,
): ShippingPricingPublicConfig {
  return {
    mode: shipping.pricingMode,
    flatRateUsd: shipping.flatRateUsd,
    freeShippingEnabled: shipping.freeShippingEnabled,
    freeShippingMinUsd: shipping.freeShippingMinUsd,
  };
}

/**
 * Calcula el cobro de envío según modalidad del comerciante.
 * Retiro (pickup) no cobra. COD no suma al total. Flat suma tarifa salvo envío gratis.
 * Envío gratis: siempre (minUsd === 0) o a partir de un monto mínimo.
 */
export function resolveShippingQuote(input: ShippingQuoteInput): ShippingQuote {
  const pricing = readPricing(input.pricing);
  const merchandiseUsd = Math.max(0, Number(input.merchandiseUsd) || 0);
  const minUsd = Math.max(0, Number(pricing.freeShippingMinUsd) || 0);
  const freeEnabled = Boolean(pricing.freeShippingEnabled);
  const always = freeEnabled && minUsd <= 0;
  const unlocked = freeEnabled && (always || merchandiseUsd >= minUsd);
  const remainingUsd =
    freeEnabled && !always && !unlocked
      ? Math.max(0, Math.round((minUsd - merchandiseUsd) * 100) / 100)
      : 0;

  const freeShipping = {
    enabled: freeEnabled,
    always,
    minUsd,
    unlocked,
    remainingUsd,
  };

  const method = typeof input.method === "string" ? input.method.trim() : "";
  const isPickup = method === "pickup";
  const appliesPaidShipping =
    Boolean(method) &&
    !isPickup &&
    (isNationalCarrierKey(method) || method === "delivery");

  if (!appliesPaidShipping) {
    return {
      chargeUsd: 0,
      chargeLabel: isPickup ? "Sin costo" : "—",
      summaryLabel: isPickup ? "Retiro · sin costo de envío" : "Sin envío",
      isFree: isPickup,
      isCod: false,
      appliesPaidShipping: false,
      freeShipping,
    };
  }

  if (unlocked) {
    return {
      chargeUsd: 0,
      chargeLabel: formatUsd(0),
      summaryLabel: FREE_SHIPPING_VE_LABEL,
      isFree: true,
      isCod: false,
      appliesPaidShipping: true,
      freeShipping,
    };
  }

  if (pricing.mode === "flat") {
    const flat = Math.max(0, Math.round((Number(pricing.flatRateUsd) || 0) * 100) / 100);
    return {
      chargeUsd: flat,
      chargeLabel: formatUsd(flat),
      summaryLabel: `Tarifa plana nacional · ${formatUsd(flat)}`,
      isFree: flat <= 0,
      isCod: false,
      appliesPaidShipping: true,
      freeShipping,
    };
  }

  return {
    chargeUsd: 0,
    chargeLabel: "Cobro a destino",
    summaryLabel:
      "Cobro a destino · el cliente paga el envío en la agencia al retirar",
    isFree: false,
    isCod: true,
    appliesPaidShipping: true,
    freeShipping,
  };
}

export function formatShippingOptionHint(quote: ShippingQuote): string | null {
  if (!quote.appliesPaidShipping) return null;
  if (quote.isFree) return FREE_SHIPPING_VE_LABEL;
  if (quote.freeShipping.enabled && !quote.freeShipping.unlocked) {
    return `Te faltan ${formatUsd(quote.freeShipping.remainingUsd)} para envío gratis`;
  }
  if (quote.isCod) {
    return "Pagas el envío al recibir en la agencia";
  }
  return `Envío: ${quote.chargeLabel}`;
}

/** Copy promocional según regla de envío gratis (admin / vitrina). */
export function describeFreeShippingRule(pricing: {
  freeShippingEnabled: boolean;
  freeShippingMinUsd: number;
}): string | null {
  if (!pricing.freeShippingEnabled) return null;
  const minUsd = Math.max(0, Number(pricing.freeShippingMinUsd) || 0);
  if (minUsd <= 0) return FREE_SHIPPING_VE_LABEL;
  return `Envío gratis desde ${formatUsd(minUsd)}.`;
}
