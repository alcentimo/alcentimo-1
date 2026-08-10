const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Tiempo relativo discreto para actividad del cliente (visita / compra).
 * Ej.: "hoy", "ayer", "hace 3d", "hace 2 sem", "hace 4 mes".
 */
export function formatRelativeActivityLabel(
  value: string | null | undefined,
  referenceDate = new Date(),
): string | null {
  if (!value) return null;

  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return null;

  const diffMs = Math.max(0, referenceDate.getTime() - then);

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.max(1, Math.floor(diffMs / MS_PER_MINUTE));
    if (minutes < 60) {
      return minutes <= 1 ? "hace un momento" : `hace ${minutes} min`;
    }
  }

  const hours = Math.floor(diffMs / MS_PER_HOUR);
  if (hours < 24) {
    return hours <= 1 ? "hace 1 h" : `hace ${hours} h`;
  }

  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days === 1) return "ayer";
  if (days < 14) return `hace ${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) return weeks === 1 ? "hace 1 sem" : `hace ${weeks} sem`;

  const months = Math.floor(days / 30);
  if (months < 18) return months <= 1 ? "hace 1 mes" : `hace ${months} mes`;

  const years = Math.floor(days / 365);
  return years <= 1 ? "hace 1 año" : `hace ${years} años`;
}

/** Etiqueta corta para la UI: "Vio el catálogo hace 3d". */
export function formatCatalogVisitLabel(
  lastCatalogVisitAt: string | null | undefined,
  referenceDate = new Date(),
): string | null {
  const relative = formatRelativeActivityLabel(lastCatalogVisitAt, referenceDate);
  if (!relative) return null;
  return `Vio el catálogo ${relative}`;
}

/** Días desde la última visita (null si no hay registro). */
export function computeDaysSinceCatalogVisit(
  lastCatalogVisitAt: string | null | undefined,
  referenceDate = new Date(),
): number | null {
  if (!lastCatalogVisitAt) return null;
  const then = new Date(lastCatalogVisitAt).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, (referenceDate.getTime() - then) / MS_PER_DAY);
}

/** Visita antigua (>30d) o sin registro: señal visual de inactividad de navegación. */
export function isCatalogVisitStale(
  lastCatalogVisitAt: string | null | undefined,
  referenceDate = new Date(),
  staleDays = 30,
): boolean {
  const days = computeDaysSinceCatalogVisit(lastCatalogVisitAt, referenceDate);
  if (days == null) return true;
  return days > staleDays;
}
