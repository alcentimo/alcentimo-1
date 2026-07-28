import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";

const DEFAULT_MAX_AGE_MS = 26 * 60 * 60 * 1000;

/**
 * true si la tasa no corresponde al día operativo de Venezuela
 * (aunque se haya tocado hace pocas horas con la publicación de ayer).
 */
export function isBcvRateBehindCalendarDay(
  updatedAt: string | null | undefined,
  reference = new Date(),
): boolean {
  if (!updatedAt) return true;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return true;

  const rateDay = getVenezuelaSyncDate(parsed);
  const today = getVenezuelaSyncDate(reference);
  return rateDay < today;
}

/** true si la tasa lleva más de maxAgeHours sin actualizarse (por defecto ~26 h). */
export function isBcvRateStale(
  updatedAt: string | null | undefined,
  maxAgeHours = 26,
): boolean {
  if (!updatedAt) return true;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return true;

  if (isBcvRateBehindCalendarDay(updatedAt)) return true;

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return Date.now() - parsed.getTime() > maxAgeMs;
}

export function bcvRateAgeHours(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return Math.round((Date.now() - parsed.getTime()) / (60 * 60 * 1000));
}

export function bcvRateMaxAgeMs(): number {
  return DEFAULT_MAX_AGE_MS;
}
