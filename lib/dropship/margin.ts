/**
 * Márgenes dropshipping: precio de venta sugerido a partir del costo mayorista.
 */

import type { DropshipPricingSettings } from "@/lib/store-settings/types";

export type { DropshipPricingSettings };

export function defaultDropshipPricingSettings(): DropshipPricingSettings {
  return {
    enabled: false,
    marginType: "percent",
    marginValue: 30,
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

/** Precio de venta sugerido a partir del costo y la regla de margen. */
export function suggestRetailFromWholesaleCost(
  costUsd: number,
  settings: DropshipPricingSettings,
): number | null {
  if (!settings.enabled) return null;
  const cost = Math.max(0, Number(costUsd) || 0);
  if (cost <= 0) return null;
  if (settings.marginType === "fixed") {
    const retail = cost + settings.marginValue;
    return retail > 0 ? Math.round(retail * 100) / 100 : null;
  }
  const multiplier = 1 + settings.marginValue / 100;
  const retail = cost * multiplier;
  return retail > 0 ? Math.round(retail * 100) / 100 : null;
}

/**
 * Precio de venta al importar al catálogo del dropshipper:
 * usa el precio individual si es válido (> 0); si no, el margen por defecto de la tienda.
 */
export function resolveDropshipImportRetailUsd(
  wholesalePriceUsd: number,
  settings: DropshipPricingSettings,
  individualRetailUsd?: number | null,
): number | null {
  const wholesale = Math.max(0, Number(wholesalePriceUsd) || 0);
  if (wholesale <= 0) return null;

  if (
    individualRetailUsd != null &&
    Number.isFinite(individualRetailUsd) &&
    individualRetailUsd > 0
  ) {
    return Math.round(individualRetailUsd * 100) / 100;
  }

  return suggestRetailFromWholesaleCost(wholesale, settings);
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
