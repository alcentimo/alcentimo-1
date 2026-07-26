import type { DailySalesPoint, MetricComparison } from "@/lib/analytics/types";
import { formatUsd } from "@/lib/format";

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
  if (withSales.length === 0) {
    return "No hubo días con ventas en este periodo.";
  }

  const sorted = [...withSales].sort((a, b) => b.amountUsd - a.amountUsd);
  const top = sorted.slice(0, 2);

  if (top.length === 1) {
    return `El día con más movimiento fue ${top[0].label} (${formatUsd(top[0].amountUsd)}).`;
  }

  return `Los días con más movimiento fueron ${top[0].label} (${formatUsd(top[0].amountUsd)}) y ${top[1].label} (${formatUsd(top[1].amountUsd)}).`;
}

export function summarizeTopProduct(
  products: { name: string; unitsSold: number; revenueUsd: number }[],
): string {
  const top = products[0];
  if (!top || top.unitsSold <= 0) {
    return "Aún no hay un producto estrella claro en el periodo.";
  }

  return `Producto destacado: ${top.name} (${top.unitsSold} unidad${top.unitsSold !== 1 ? "es" : ""}, ${formatUsd(top.revenueUsd)}).`;
}
