import { roundMoneyDisplay, formatUsd } from "@/lib/format";

/** Convierte precio USD a bolívares con la tasa vigente (2 decimales). */
export function computeUsdToVes(
  priceUsd: number | null | undefined,
  exchangeRate: number | null | undefined,
): number | null {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd < 0) {
    return null;
  }

  if (exchangeRate == null || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return null;
  }

  return roundMoneyDisplay(priceUsd * roundMoneyDisplay(exchangeRate));
}

/** Porcentaje de descuento cuando compare_at > precio de venta. */
export function computeProductDiscountPercent(
  compareAtUsd: number | null | undefined,
  salePriceUsd: number | null | undefined,
): number | null {
  if (
    compareAtUsd == null ||
    salePriceUsd == null ||
    !Number.isFinite(compareAtUsd) ||
    !Number.isFinite(salePriceUsd) ||
    compareAtUsd <= 0 ||
    salePriceUsd <= 0 ||
    compareAtUsd <= salePriceUsd
  ) {
    return null;
  }

  return Math.round((1 - salePriceUsd / compareAtUsd) * 100);
}

export function isProductOnSale(
  compareAtUsd: number | null | undefined,
  salePriceUsd: number | null | undefined,
): boolean {
  return computeProductDiscountPercent(compareAtUsd, salePriceUsd) != null;
}

export function hasWholesalePricing(
  wholesalePriceUsd: number | null | undefined,
  wholesaleMinQty: number | null | undefined,
): boolean {
  return (
    wholesalePriceUsd != null &&
    Number.isFinite(wholesalePriceUsd) &&
    wholesalePriceUsd >= 0 &&
    wholesaleMinQty != null &&
    Number.isInteger(wholesaleMinQty) &&
    wholesaleMinQty >= 2
  );
}

export function resolveUnitPriceUsd(input: {
  retailUsd: number;
  wholesalePriceUsd?: number | null;
  wholesaleMinQty?: number | null;
  quantity: number;
  priceExtraUsd?: number;
}): {
  unitPriceUsd: number;
  wholesaleApplied: boolean;
  retailUnitUsd: number;
} {
  const extra = input.priceExtraUsd ?? 0;
  const retailUnitUsd = input.retailUsd + extra;

  if (
    hasWholesalePricing(input.wholesalePriceUsd, input.wholesaleMinQty) &&
    input.quantity >= (input.wholesaleMinQty as number)
  ) {
    return {
      unitPriceUsd: (input.wholesalePriceUsd as number) + extra,
      wholesaleApplied: true,
      retailUnitUsd,
    };
  }

  return {
    unitPriceUsd: retailUnitUsd,
    wholesaleApplied: false,
    retailUnitUsd,
  };
}

export function formatWholesaleHint(
  wholesalePriceUsd: number,
  wholesaleMinQty: number,
): string {
  return `Mayorista desde ${wholesaleMinQty} u. · ${formatUsd(wholesalePriceUsd)}/u`;
}
