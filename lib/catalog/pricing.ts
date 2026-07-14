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
