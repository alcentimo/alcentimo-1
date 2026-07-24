import type { LocationHoursSettings, WeekdayKey } from "@/lib/store-settings/types";

const JS_DAY_TO_WEEKDAY: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export interface StoreOpenStatus {
  isOpen: boolean;
  label: "Abierta" | "Cerrada";
  /** Texto corto para tooltip o detalle, p. ej. "Hoy 09:00 – 18:00". */
  scheduleHint: string;
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatTimeLabel(value: string): string {
  const minutes = parseTimeToMinutes(value);
  if (minutes == null) return value;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "p. m." : "a. m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return mins === 0
    ? `${hour12}:00 ${period}`
    : `${hour12}:${String(mins).padStart(2, "0")} ${period}`;
}

export function getStoreOpenStatus(
  locationHours: LocationHoursSettings,
  now: Date = new Date(),
): StoreOpenStatus {
  const dayKey = JS_DAY_TO_WEEKDAY[now.getDay()];
  const day = locationHours.schedule[dayKey];
  const dayEnabled = day?.enabled ?? false;
  const openTime = day?.openTime || locationHours.openTime;
  const closeTime = day?.closeTime || locationHours.closeTime;
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const scheduleHint = dayEnabled
    ? `Hoy ${formatTimeLabel(openTime)} – ${formatTimeLabel(closeTime)}`
    : "Hoy cerrado";

  if (!dayEnabled || openMinutes == null || closeMinutes == null) {
    return { isOpen: false, label: "Cerrada", scheduleHint };
  }

  const isOpen =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return {
    isOpen,
    label: isOpen ? "Abierta" : "Cerrada",
    scheduleHint,
  };
}
