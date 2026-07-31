/** Fecha operativa (YYYY-MM-DD) en hora de Venezuela. */
export function getVenezuelaSyncDate(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getVenezuelaNextSyncDate(reference = new Date()): string {
  return addCalendarDays(getVenezuelaSyncDate(reference), 1);
}

export function getVenezuelaHour(reference = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(reference)
    .find((part) => part.type === "hour")?.value;

  const hour = Number.parseInt(hourPart ?? "0", 10);
  if (!Number.isFinite(hour) || hour === 24) return 0;
  return hour;
}

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

  if (
    (slot === "manual" ||
      slot === "autoheal" ||
      slot === "afternoon" ||
      !slot) &&
    hour >= 16
  ) {
    return getVenezuelaNextSyncDate(reference);
  }

  return getVenezuelaSyncDate(reference);
}
