/**
 * Redondeo estándar a 2 decimales para mostrar montos al cliente.
 * No usar en cálculos internos: los totales deben sumarse con precisión completa.
 */
export function roundMoneyDisplay(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
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

/** Tasa de cambio (no es precio): conserva más decimales para cálculos visibles. */
export function formatExchangeRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rate);
}
