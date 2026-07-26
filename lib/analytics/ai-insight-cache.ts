import type { AnalyticsDateRange } from "@/lib/analytics/types";

const CACHE_PREFIX = "alcentimo:analytics-ai-insight:";
const COOLDOWN_PREFIX = "alcentimo:analytics-ai-insight-cooldown:";

export const ANALYTICS_INSIGHT_COOLDOWN_MS = 60_000;

export interface CachedAnalyticsInsight {
  insight: string;
  periodKey: string;
  dayKey: string;
}

export function getAnalyticsInsightPeriodKey(dateRange: AnalyticsDateRange): string {
  return `${dateRange.preset}:${dateRange.from}:${dateRange.to}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheStorageKey(periodKey: string): string {
  return `${CACHE_PREFIX}${periodKey}`;
}

export function readCachedAnalyticsInsight(periodKey: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(cacheStorageKey(periodKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAnalyticsInsight;
    if (parsed.dayKey !== todayKey() || !parsed.insight?.trim()) {
      localStorage.removeItem(cacheStorageKey(periodKey));
      return null;
    }

    return parsed.insight.trim();
  } catch {
    return null;
  }
}

function cooldownStorageKey(periodKey: string): string {
  return `${COOLDOWN_PREFIX}${periodKey}`;
}

export function readAnalyticsInsightCooldownUntil(
  periodKey: string,
): number | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(cooldownStorageKey(periodKey));
    if (!raw) return null;

    const until = Number.parseInt(raw, 10);
    if (!Number.isFinite(until) || until <= Date.now()) {
      localStorage.removeItem(cooldownStorageKey(periodKey));
      return null;
    }

    return until;
  } catch {
    return null;
  }
}

export function writeAnalyticsInsightCooldown(periodKey: string): number {
  const until = Date.now() + ANALYTICS_INSIGHT_COOLDOWN_MS;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cooldownStorageKey(periodKey), String(until));
    } catch {
      // Ignore storage failures.
    }
  }

  return until;
}

export function writeCachedAnalyticsInsight(
  periodKey: string,
  insight: string,
): void {
  if (typeof window === "undefined") return;

  const entry: CachedAnalyticsInsight = {
    insight: insight.trim(),
    periodKey,
    dayKey: todayKey(),
  };

  try {
    localStorage.setItem(cacheStorageKey(periodKey), JSON.stringify(entry));
  } catch {
    // Quota exceeded or private mode — ignore silently.
  }
}
