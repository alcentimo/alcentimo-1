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
 *
 * Prioridad:
 * 1) Fecha reportada por la API (effective_date / date / fechaActualizacion)
 *    si cae en hoy o mañana VE — evita guardar la tasa de hoy como “mañana”
 *    en slots evening cuando el BCV ya actualizó el valor del día.
 * 2) Si la fuente trae una fecha anterior a hoy VE, se asume que es la última
 *    cotización publicada (fines de semana / BCV atrasado) y aplica hoy.
 *    Esto es seguro solo porque fetchBcvUsdRate() ya eligió la fuente más
 *    fresca entre espejos; no uses first-success con bcv.today.
 * 3) Heurística por slot/hora: tras ~16:00 VE los slots de tarde suelen
 *    publicar la tasa del día siguiente.
 */
export function resolveBcvEffectiveDate(options: {
  slot?: string;
  reference?: Date;
  sourceEffectiveDate?: string | null;
}): string {
  const reference = options.reference ?? new Date();
  const slot = options.slot ?? "";
  const hour = getVenezuelaHour(reference);
  const today = getVenezuelaSyncDate(reference);
  const tomorrow = getVenezuelaNextSyncDate(reference);

  const sourceDate = options.sourceEffectiveDate?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) {
    if (sourceDate === today || sourceDate === tomorrow) {
      return sourceDate;
    }
    // Última cotización conocida (finde / BCV aún no publica): vale para hoy.
    if (sourceDate < today) {
      return today;
    }
  }

  if (slot === "evening" || slot === "late_evening") {
    return tomorrow;
  }

  // Manual / autoheal / afternoon sin fecha de fuente: a partir de las 16:00 VE
  // tratamos la publicación como tasa del día siguiente.
  if (
    (slot === "manual" || slot === "autoheal" || slot === "afternoon" || !slot) &&
    hour >= 16
  ) {
    return tomorrow;
  }

  return today;
}
