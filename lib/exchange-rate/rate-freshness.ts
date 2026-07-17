const DEFAULT_MAX_AGE_MS = 26 * 60 * 60 * 1000;

/** true si la tasa lleva más de maxAgeHours sin actualizarse (por defecto ~26 h). */
export function isBcvRateStale(
  updatedAt: string | null | undefined,
  maxAgeHours = 26,
): boolean {
  if (!updatedAt) return true;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return true;

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return Date.now() - parsed.getTime() > maxAgeMs;
}

export function bcvRateAgeHours(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return Math.round((Date.now() - parsed.getTime()) / (60 * 60 * 1000));
}
