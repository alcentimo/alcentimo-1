/**
 * Márgenes dropshipping: precio de venta sugerido a partir del costo mayorista.
 */

import type { DropshipPricingSettings } from "@/lib/store-settings/types";

export type { DropshipPricingSettings };

/** Margen óptimo por defecto al activar productos en la vitrina. */
export const DEFAULT_DROPSHIP_MARGIN_PERCENT = 30;

export function defaultDropshipPricingSettings(): DropshipPricingSettings {
  return {
    enabled: true,
    marginType: "percent",
    marginValue: DEFAULT_DROPSHIP_MARGIN_PERCENT,
    autoApplyOnCostChange: false,
  };
}

export function normalizeDropshipPricingSettings(
  raw: unknown,
): DropshipPricingSettings {
  const defaults = defaultDropshipPricingSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const record = raw as Record<string, unknown>;

  const marginType =
    record.marginType === "fixed" ? "fixed" : ("percent" as const);
  let marginValue = Number(record.marginValue);
  if (!Number.isFinite(marginValue) || marginValue < 0) {
    marginValue = defaults.marginValue;
  }
  if (marginType === "percent") {
    marginValue = Math.min(1000, Math.round(marginValue * 100) / 100);
  } else {
    marginValue = Math.round(marginValue * 100) / 100;
  }

  return {
    enabled:
      typeof record.enabled === "boolean" ? record.enabled : defaults.enabled,
    marginType,
    marginValue,
    autoApplyOnCostChange:
      typeof record.autoApplyOnCostChange === "boolean"
        ? record.autoApplyOnCostChange
        : defaults.autoApplyOnCostChange,
  };
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Redondeo a precios comerciales (terminación .99 o entero limpio).
 * Siempre queda en o por encima del monto crudo para no recortar margen.
 */
export function roundToCommercialUsd(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const cents = roundCents(value);
  if (cents < 1) return Math.max(0.01, cents);

  const isWhole = Math.abs(cents - Math.round(cents)) < 0.001;
  if (isWhole) return roundCents(cents);

  if (cents >= 100) {
    return Math.ceil(cents);
  }

  return roundCents(Math.ceil(cents) - 0.01);
}

function ensureRetailAboveCost(retail: number, cost: number): number {
  let next = roundCents(retail);
  if (next > cost) return next;
  next = roundToCommercialUsd(cost + Math.max(0.5, cost * 0.05));
  if (next > cost) return next;
  return roundCents(cost + 1);
}

function rawRetailFromMargin(
  cost: number,
  settings: DropshipPricingSettings,
): number | null {
  if (cost <= 0) return null;
  if (settings.marginType === "fixed") {
    const retail = cost + settings.marginValue;
    return retail > 0 ? roundCents(retail) : null;
  }
  const percent =
    settings.marginValue > 0
      ? settings.marginValue
      : DEFAULT_DROPSHIP_MARGIN_PERCENT;
  const retail = cost * (1 + percent / 100);
  return retail > 0 ? roundCents(retail) : null;
}

/**
 * Precio de venta sugerido a partir del costo y la regla de margen,
 * con redondeo comercial. Calcula aunque la regla aún no esté “activada”
 * en ajustes (el import la activa por defecto).
 */
export function suggestRetailFromWholesaleCost(
  costUsd: number,
  settings: DropshipPricingSettings,
): number | null {
  const cost = Math.max(0, Number(costUsd) || 0);
  const raw = rawRetailFromMargin(cost, settings);
  if (raw == null) return null;
  return ensureRetailAboveCost(roundToCommercialUsd(raw), cost);
}

export function estimateNetProfitUsd(
  retailUsd: number | null | undefined,
  costUsd: number | null | undefined,
): number | null {
  const retail = Number(retailUsd);
  const cost = Number(costUsd);
  if (!Number.isFinite(retail) || !Number.isFinite(cost)) return null;
  return roundCents(retail - cost);
}

/**
 * Precio de venta al importar al catálogo del dropshipper:
 * 1) precio individual del comerciante (> 0), sin redondeo psicológico
 * 2) costo + margen óptimo (tienda o 30%) con redondeo comercial
 * 3) precio sugerido de plataforma, también comercial
 */
export function resolveDropshipImportRetailUsd(
  wholesalePriceUsd: number,
  settings: DropshipPricingSettings,
  individualRetailUsd?: number | null,
  platformSuggestedRetailUsd?: number | null,
): number | null {
  const wholesale = Math.max(0, Number(wholesalePriceUsd) || 0);
  if (wholesale <= 0) return null;

  if (
    individualRetailUsd != null &&
    Number.isFinite(individualRetailUsd) &&
    individualRetailUsd > 0
  ) {
    return roundCents(individualRetailUsd);
  }

  const fromMargin = suggestRetailFromWholesaleCost(wholesale, {
    ...settings,
    enabled: true,
    marginValue:
      settings.marginValue > 0
        ? settings.marginValue
        : DEFAULT_DROPSHIP_MARGIN_PERCENT,
  });
  if (fromMargin != null && fromMargin > wholesale) {
    return fromMargin;
  }

  if (
    platformSuggestedRetailUsd != null &&
    Number.isFinite(platformSuggestedRetailUsd) &&
    platformSuggestedRetailUsd > 0
  ) {
    return ensureRetailAboveCost(
      roundToCommercialUsd(platformSuggestedRetailUsd),
      wholesale,
    );
  }

  return fromMargin;
}

export function formatDropshipMarginLabel(
  settings: DropshipPricingSettings,
): string {
  if (!settings.enabled) return "Sin regla de margen";
  if (settings.marginType === "fixed") {
    return `+$${settings.marginValue.toFixed(2)} USD`;
  }
  return `+${settings.marginValue}%`;
}
