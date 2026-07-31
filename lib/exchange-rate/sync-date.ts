const VENEZUELA_TZ = "America/Caracas";

/** Fecha operativa (YYYY-MM-DD) en hora de Venezuela. */
export function getVenezuelaSyncDate(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VENEZUELA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

/** Suma días a una fecha YYYY-MM-DD (calendario gregoriano, sin TZ). */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Día siguiente operativo en Venezuela. */
export function getVenezuelaNextSyncDate(reference = new Date()): string {
  return addCalendarDays(getVenezuelaSyncDate(reference), 1);
}

/** Hora local 0–23 en America/Caracas. */
export function getVenezuelaHour(reference = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: VENEZUELA_TZ,
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(reference)
    .find((part) => part.type === "hour")?.value;

  const hour = Number.parseInt(hourPart ?? "0", 10);
  // Algunos entornos reportan "24" a medianoche.
  if (!Number.isFinite(hour) || hour === 24) return 0;
  return hour;
}

/**
 * Fecha de vigencia de la tasa descargada.
 * Tras ~16:00 VE el BCV publica la tasa del día siguiente: se guarda para
 * activarse a las 00:00 VE. Antes de esa hora, la API suele devolver la tasa
 * ya vigente hoy.
 */
export function resolveBcvEffectiveDate(options: {
  slot?: string;
  reference?: Date;
}): string {
  const reference = options.reference ?? new Date();
  const slot = options.slot ?? "";
  const hour = getVenezuelaHour(reference);

  if (slot === "evening" || slot === "late_evening") {
    return getVenezuelaNextSyncDate(reference);
  }

  // Manual / autoheal / afternoon sin slot claro: a partir de las 16:00 VE
  // tratamos la publicación como tasa del día siguiente.
  if (
    (slot === "manual" || slot === "autoheal" || slot === "afternoon" || !slot) &&
    hour >= 16
  ) {
    return getVenezuelaNextSyncDate(reference);
  }

  return getVenezuelaSyncDate(reference);
}
