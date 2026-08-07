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

export function getVenezuelaWeekday(reference = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "short",
  }).format(reference);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function isVenezuelaWeekend(reference = new Date()): boolean {
  const day = getVenezuelaWeekday(reference);
  return day === 0 || day === 6;
}

export function getNextBusinessDate(
  fromDate: string,
  options?: { exclusive?: boolean },
): string {
  let cursor = options?.exclusive === false
    ? fromDate
    : addCalendarDays(fromDate, 1);
  for (let i = 0; i < 10; i++) {
    const [y, m, d] = cursor.split("-").map((part) => Number.parseInt(part, 10));
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) return cursor;
    cursor = addCalendarDays(cursor, 1);
  }
  return cursor;
}

export function getVenezuelaNextBusinessDate(reference = new Date()): string {
  return getNextBusinessDate(getVenezuelaSyncDate(reference), {
    exclusive: true,
  });
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isBcvEffectiveDateActiveNow(
  effectiveDate: string | null | undefined,
  reference = new Date(),
): boolean {
  if (!effectiveDate || !ISO_DATE_RE.test(effectiveDate)) return false;
  const today = getVenezuelaSyncDate(reference);
  if (effectiveDate <= today) return true;
  if (!isVenezuelaWeekend(reference)) return false;
  return effectiveDate === getVenezuelaNextBusinessDate(reference);
}

/**
 * Persistencia estricta: fecha oficial de la API. Heurística solo sin fecha.
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
  const nextBiz = getVenezuelaNextBusinessDate(reference);
  const earliestAccepted = addCalendarDays(today, -30);
  const latestAccepted = addCalendarDays(today, 10);

  const sourceDate = options.sourceEffectiveDate?.trim() ?? "";
  if (ISO_DATE_RE.test(sourceDate)) {
    if (sourceDate >= earliestAccepted && sourceDate <= latestAccepted) {
      return sourceDate;
    }
  }

  if (slot === "evening" || slot === "late_evening") {
    if (getVenezuelaWeekday(reference) === 5) return nextBiz;
    return tomorrow;
  }

  if (
    (slot === "manual" ||
      slot === "autoheal" ||
      slot === "afternoon" ||
      !slot) &&
    hour >= 16
  ) {
    if (getVenezuelaWeekday(reference) === 5) return nextBiz;
    return tomorrow;
  }

  return today;
}
