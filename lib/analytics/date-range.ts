import type { AnalyticsDateRange, AnalyticsRangePreset } from "@/lib/analytics/types";

export const ANALYTICS_RANGE_PRESETS: {
  preset: AnalyticsRangePreset;
  label: string;
}[] = [
  { preset: "today", label: "Hoy" },
  { preset: "7d", label: "Últimos 7 días" },
  { preset: "month", label: "Este mes" },
  { preset: "prev_month", label: "Mes anterior" },
  { preset: "custom", label: "Personalizado" },
];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatRangeLabel(from: string, to: string): string {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);
  const sameMonth =
    fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth();

  const dayFmt = new Intl.DateTimeFormat("es", { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat("es", { month: "short" });
  const fullFmt = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (from === to) {
    return fullFmt.format(fromDate);
  }

  if (sameMonth) {
    return `${dayFmt.format(fromDate)}–${dayFmt.format(toDate)} ${monthFmt.format(fromDate)}`;
  }

  return `${fullFmt.format(fromDate)} – ${fullFmt.format(toDate)}`;
}

function buildPreviousRange(from: string, to: string): {
  previousFrom: string;
  previousTo: string;
  previousLabel: string;
} {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);
  const dayCount =
    Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;

  const previousToDate = addDays(fromDate, -1);
  const previousFromDate = addDays(previousToDate, -(dayCount - 1));

  const previousFrom = toDateKey(previousFromDate);
  const previousTo = toDateKey(previousToDate);

  return {
    previousFrom,
    previousTo,
    previousLabel: formatRangeLabel(previousFrom, previousTo),
  };
}

function resolvePresetRange(preset: AnalyticsRangePreset): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  switch (preset) {
    case "today":
      return { from: todayKey, to: todayKey };
    case "7d": {
      const from = addDays(today, -6);
      return { from: toDateKey(from), to: todayKey };
    }
    case "month":
      return { from: toDateKey(startOfMonth(today)), to: todayKey };
    case "prev_month": {
      const prevMonthEnd = addDays(startOfMonth(today), -1);
      const prevMonthStart = startOfMonth(prevMonthEnd);
      return {
        from: toDateKey(prevMonthStart),
        to: toDateKey(prevMonthEnd),
      };
    }
    default:
      return { from: toDateKey(addDays(today, -6)), to: todayKey };
  }
}

function isValidDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return toDateKey(date) === value;
}

export function parseAnalyticsDateRange(input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): AnalyticsDateRange {
  const presetParam = input.range?.trim().toLowerCase();
  const preset: AnalyticsRangePreset =
    presetParam === "today" ||
    presetParam === "7d" ||
    presetParam === "month" ||
    presetParam === "prev_month" ||
    presetParam === "custom"
      ? presetParam
      : "month";

  let from: string;
  let to: string;

  if (preset === "custom" && isValidDateKey(input.from) && isValidDateKey(input.to)) {
    from = input.from;
    to = input.to >= input.from ? input.to : input.from;
  } else if (preset === "custom") {
    const fallback = resolvePresetRange("7d");
    from = fallback.from;
    to = fallback.to;
  } else {
    ({ from, to } = resolvePresetRange(preset));
  }

  const previous = buildPreviousRange(from, to);

  return {
    preset: preset === "custom" && !isValidDateKey(input.from) ? "7d" : preset,
    from,
    to,
    label: formatRangeLabel(from, to),
    ...previous,
  };
}

export function isIsoInDateRange(iso: string, from: string, to: string): boolean {
  const key = toDateKey(new Date(iso));
  return key >= from && key <= to;
}

export function buildDailySalesBuckets(
  from: string,
  to: string,
): { date: string; label: string }[] {
  const buckets: { date: string; label: string }[] = [];
  let cursor = parseDateKey(from);
  const end = parseDateKey(to);
  const dayCount =
    Math.round((end.getTime() - cursor.getTime()) / 86_400_000) + 1;

  const weekday = new Intl.DateTimeFormat("es", { weekday: "short" });
  const dayMonth = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

  while (cursor <= end) {
    const date = toDateKey(cursor);
    buckets.push({
      date,
      label:
        dayCount <= 7
          ? weekday.format(cursor).replace(".", "")
          : dayMonth.format(cursor).replace(".", ""),
    });
    cursor = addDays(cursor, 1);
  }

  return buckets;
}

export function computeChangePct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function previousPeriodCaption(preset: AnalyticsRangePreset): string {
  switch (preset) {
    case "today":
      return "vs. ayer";
    case "7d":
      return "vs. 7 días anteriores";
    case "month":
      return "vs. periodo anterior";
    case "prev_month":
      return "vs. mes previo";
    case "custom":
      return "vs. periodo anterior";
    default:
      return "vs. periodo anterior";
  }
}
