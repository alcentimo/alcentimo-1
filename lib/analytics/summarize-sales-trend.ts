import type { DailySalesPoint, MetricComparison } from "@/lib/analytics/types";
import { formatUsd } from "@/lib/format";

export function formatMetricChangeCompact(metric: MetricComparison): string {
  const { value, previousValue, changePct } = metric;

  if (previousValue <= 0 && value <= 0) return "sin actividad";
  if (previousValue <= 0 && value > 0) return "nuevo vs periodo ant.";
  if (changePct == null) return "mejor vs ant.";
  const sign = changePct >= 0 ? "+" : "";
  return `${sign}${changePct.toFixed(0)}% vs ant.`;
}

export function formatMetricChangeDescription(
  metric: MetricComparison,
  unit: "currency" | "count" | "percent",
): string {
  const { value, previousValue, changePct } = metric;

  if (previousValue <= 0 && value <= 0) {
    return "Sin actividad en este periodo ni en el anterior.";
  }

  if (previousValue <= 0 && value > 0) {
    return "Primeras ventas del periodo comparado.";
  }

  if (changePct == null) {
    return "Mejor que el periodo anterior.";
  }

  const direction =
    changePct > 0 ? "subió" : changePct < 0 ? "bajó" : "se mantuvo igual";
  const formattedValue =
    unit === "currency"
      ? formatUsd(value)
      : unit === "percent"
        ? `${value.toFixed(1)}%`
        : String(Math.round(value));

  return `${formattedValue} (${direction} ${Math.abs(changePct).toFixed(0)}% vs periodo anterior).`;
}

export function summarizeBusiestDays(salesTrend: DailySalesPoint[]): string {
  const withSales = salesTrend.filter((day) => day.amountUsd > 0);
  if (withSales.length === 0) return "Sin ventas";

  const sorted = [...withSales].sort((a, b) => b.amountUsd - a.amountUsd);
  const top = sorted[0];
  return `Pico:${top.label} ${formatUsd(top.amountUsd)}`;
}

export function summarizeTopProduct(
  products: { name: string; unitsSold: number; revenueUsd: number }[],
): string {
  const top = products[0];
  if (!top || top.unitsSold <= 0) return "Sin top producto";

  const name = top.name.length > 30 ? `${top.name.slice(0, 28)}…` : top.name;
  return `Top:${name} ${top.unitsSold}u ${formatUsd(top.revenueUsd)}`;
}
