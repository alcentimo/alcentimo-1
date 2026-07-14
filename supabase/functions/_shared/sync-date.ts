/** Fecha operativa (YYYY-MM-DD) en hora de Venezuela. */
export function getVenezuelaSyncDate(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}
