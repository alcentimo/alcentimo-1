import {
  getVenezuelaNextBusinessDate,
  getVenezuelaSyncDate,
  isVenezuelaWeekend,
} from "@/lib/exchange-rate/sync-date";

/**
 * true si la tasa vigente no cubre el momento operativo de Venezuela.
 *
 * - Día hábil: atrasada si effective_date < hoy (carry-forward de ayer).
 * - Fin de semana: al día solo si ya está la tasa del próximo hábil (lunes)
 *   publicada el viernes; si solo hay la del viernes, autoheal reintenta.
 */
export function isBcvRateBehindCalendarDay(
  effectiveDateOrUpdatedAt: string | null | undefined,
  reference = new Date(),
): boolean {
  if (!effectiveDateOrUpdatedAt) return true;

  // effective_date YYYY-MM-DD o timestamp ISO
  const rateDay =
    effectiveDateOrUpdatedAt.length >= 10 &&
    /^\d{4}-\d{2}-\d{2}/.test(effectiveDateOrUpdatedAt)
      ? effectiveDateOrUpdatedAt.slice(0, 10)
      : (() => {
          const parsed = new Date(effectiveDateOrUpdatedAt);
          if (Number.isNaN(parsed.getTime())) return null;
          return getVenezuelaSyncDate(parsed);
        })();

  if (!rateDay) return true;

  if (isVenezuelaWeekend(reference)) {
    return rateDay !== getVenezuelaNextBusinessDate(reference);
  }

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
  return 26 * 60 * 60 * 1000;
}
