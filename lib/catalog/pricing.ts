/** Convierte precio USD a bolívares usando la tasa vigente (sin redondeo). */
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

  return priceUsd * exchangeRate;
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
