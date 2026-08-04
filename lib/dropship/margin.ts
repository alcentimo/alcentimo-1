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
  if (settings.marginType === "fixed") {
    return Math.round((cost + settings.marginValue) * 100) / 100;
  }
  const multiplier = 1 + settings.marginValue / 100;
  return Math.round(cost * multiplier * 100) / 100;
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
