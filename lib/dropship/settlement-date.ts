import { getAlcentimoLocalDate } from "@/lib/analytics/page-visit-keys";

const CARACAS_OFFSET_HOURS = 4;

/** Inicio/fin UTC del día civil America/Caracas. */
export function getCaracasDayUtcRange(businessDate: string): {
  startIso: string;
  endIso: string;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate.trim());
  if (!match) {
    const today = getAlcentimoLocalDate();
    return getCaracasDayUtcRange(today);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = Date.UTC(year, month - 1, day, CARACAS_OFFSET_HOURS, 0, 0, 0);
  const end = start + 24 * 60 * 60 * 1000;
  return {
    startIso: new Date(start).toISOString(),
    endIso: new Date(end).toISOString(),
  };
}

export function addDaysToBusinessDate(businessDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate.trim());
  if (!match) return businessDate;
  const utc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  );
  return new Date(utc).toISOString().slice(0, 10);
}

export function formatBusinessDateEs(businessDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate.trim());
  if (!match) return businessDate;
  const utc = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(utc);
}
