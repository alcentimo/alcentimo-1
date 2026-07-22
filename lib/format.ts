/**
 * Redondeo estándar a 2 decimales para montos y tasa BCV (estándar monetario VE).
 */
export function roundMoneyDisplay(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** Alias explícito para la tasa USD/VES (siempre 2 decimales). */
export function roundExchangeRate(rate: number): number {
  return roundMoneyDisplay(rate);
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoneyDisplay(amount));
}

export function formatApproxBs(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const formatted = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoneyDisplay(amount));
  return `≈ ${formatted} Bs`;
}

export function formatVes(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `Bs. ${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoneyDisplay(amount))}`;
}

/** Tasa BCV: siempre exactamente 2 decimales (ej. 737,23). */
export function formatExchangeRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundExchangeRate(rate));
}
