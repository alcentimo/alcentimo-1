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

/** Hora local 0–23 en America/Caracas. */
export function getVenezuelaHour(reference = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: VENEZUELA_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(reference).find((part) => part.type === "hour")?.value;

  const hour = Number.parseInt(hourPart ?? "0", 10);
  // Algunos entornos reportan "24" a medianoche.
  if (!Number.isFinite(hour) || hour === 24) return 0;
  return hour;
}
