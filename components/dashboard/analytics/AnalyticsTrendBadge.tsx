import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { previousPeriodCaption } from "@/lib/analytics/date-range";
import type { AnalyticsRangePreset, MetricComparison } from "@/lib/analytics/types";

interface AnalyticsTrendBadgeProps {
  metric: MetricComparison;
  preset: AnalyticsRangePreset;
  format?: "percent" | "currency" | "number";
}

function formatDelta(metric: MetricComparison): string {
  if (metric.changePct == null) {
    return metric.value > 0 && metric.previousValue === 0 ? "Nuevo" : "—";
  }
  if (metric.changePct === 0) return "0%";
  const sign = metric.changePct > 0 ? "+" : "";
  return `${sign}${metric.changePct}%`;
}

export function AnalyticsTrendBadge({
  metric,
  preset,
}: AnalyticsTrendBadgeProps) {
  const delta = formatDelta(metric);
  const isUp = (metric.changePct ?? 0) > 0;
  const isDown = (metric.changePct ?? 0) < 0;
  const isFlat = metric.changePct === 0 || delta === "—";

  const toneClass = isUp
    ? "analytics-trend-up"
    : isDown
      ? "analytics-trend-down"
      : "analytics-trend-flat";

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <span className={`analytics-trend-badge ${toneClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{delta}</span>
      <span className="analytics-trend-caption">{previousPeriodCaption(preset)}</span>
    </span>
  );
}
