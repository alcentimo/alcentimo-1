import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { StoreAnalytics } from "@/lib/analytics/types";

interface AnalyticsDashboardProps {
  analytics: StoreAnalytics;
}

type KpiTone = "default" | "warning" | "critical";

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
  href?: string;
  tone?: KpiTone;
}) {
  const toneClasses: Record<KpiTone, string> = {
    default: "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950",
    warning:
      "border-amber-200/90 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20",
    critical:
      "border-orange-200/90 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/25",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            tone === "default"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
              : tone === "warning"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`analytics-kpi-card transition-shadow hover:shadow-md ${toneClasses[tone]}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`analytics-kpi-card ${toneClasses[tone]}`}>{content}</div>;
}

function ProductThumb({
  name,
  thumbUrl,
}: {
  name: string;
  thumbUrl: string | null;
}) {
  if (thumbUrl) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
        <Image src={thumbUrl} alt={name} fill sizes="36px" className="object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function WeeklySalesChart({
  weeklySales,
}: {
  weeklySales: StoreAnalytics["weeklySales"];
}) {
  const maxAmount = Math.max(...weeklySales.map((day) => day.amountUsd), 1);

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Volumen de ventas por día</h2>
          <p className="analytics-panel-desc">Últimos 7 días · ventas registradas y pedidos</p>
        </div>
        <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>

      <div className="analytics-chart" role="img" aria-label="Gráfico de barras de ventas semanales">
        {weeklySales.map((day) => {
          const heightPct = Math.max(6, Math.round((day.amountUsd / maxAmount) * 100));
          return (
            <div key={day.date} className="analytics-chart-column">
              <p className="analytics-chart-amount">{formatUsd(day.amountUsd)}</p>
              <div className="analytics-chart-bar-track">
                <div
                  className="analytics-chart-bar"
                  style={{ height: `${heightPct}%` }}
                  title={`${day.label}: ${formatUsd(day.amountUsd)}`}
                />
              </div>
              <p className="analytics-chart-label">{day.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const { kpis, weeklySales, topProducts, lowStockProducts } = analytics;
  const inventoryTone: KpiTone =
    kpis.activeInventoryCount === 0
      ? "critical"
      : kpis.lowStockCount > 0
        ? "warning"
        : "default";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas totales"
          value={formatUsd(kpis.totalSalesUsd)}
          icon={TrendingUp}
          href="/dashboard/ventas"
        />
        <KpiCard
          label="Pedidos recibidos"
          value={String(kpis.ordersReceived)}
          icon={Receipt}
          href="/dashboard/pedidos"
        />
        <KpiCard
          label="Ticket promedio"
          value={formatUsd(kpis.averageTicketUsd)}
          icon={ShoppingBag}
        />
        <KpiCard
          label="Inventario activo"
          value={String(kpis.activeInventoryCount)}
          icon={Package}
          href="/dashboard/catalogo"
          tone={inventoryTone}
        />
      </div>

      <WeeklySalesChart weeklySales={weeklySales} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Top 5 productos</h2>
              <p className="analytics-panel-desc">Los más vendidos para decidir qué reponer</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <p className="analytics-empty-state">
              Aún no hay ventas registradas. Publica productos y registra tu primera venta.
            </p>
          ) : (
            <ul className="analytics-insight-list">
              {topProducts.map((product, index) => (
                <li key={product.productId} className="analytics-insight-item">
                  <span className="analytics-rank">{index + 1}</span>
                  <ProductThumb name={product.name} thumbUrl={product.thumbUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {product.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {product.unitsSold} unidad{product.unitsSold !== 1 ? "es" : ""} vendidas
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={`analytics-panel ${
            lowStockProducts.length > 0 ? "analytics-panel-warning" : ""
          }`}
        >
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Productos con stock bajo</h2>
              <p className="analytics-panel-desc">
                Menos de 3 unidades disponibles · evita perder ventas
              </p>
            </div>
            {lowStockProducts.length > 0 ? (
              <span className="analytics-warning-badge">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {lowStockProducts.length}
              </span>
            ) : null}
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="analytics-empty-state">
              Todo en orden: no hay productos con stock crítico en este momento.
            </p>
          ) : (
            <ul className="analytics-insight-list">
              {lowStockProducts.map((product) => {
                const isOut = product.availableStock <= 0;
                return (
                  <li key={product.productId} className="analytics-insight-item">
                    <ProductThumb name={product.name} thumbUrl={product.thumbUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {product.name}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          isOut
                            ? "text-orange-700 dark:text-orange-300"
                            : "text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {isOut
                          ? "Agotado"
                          : `${product.availableStock} unidad${product.availableStock !== 1 ? "es" : ""} restantes`}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/catalogo"
                      className="analytics-insight-link"
                    >
                      Reponer
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
