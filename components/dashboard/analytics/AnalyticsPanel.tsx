import Image from "next/image";
import { BarChart3, Package, UserPlus } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { StoreAnalyticsPanel } from "@/lib/analytics/types";

interface AnalyticsPanelProps {
  analytics: StoreAnalyticsPanel;
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

function DayVsMonthSalesChart({
  salesComparison,
}: {
  salesComparison: StoreAnalyticsPanel["salesComparison"];
}) {
  const { todayUsd, monthToDateUsd, todayLabel, monthLabel } = salesComparison;
  const maxAmount = Math.max(todayUsd, monthToDateUsd, 1);

  const bars = [
    { key: "today", label: todayLabel, amountUsd: todayUsd },
    { key: "month", label: monthLabel, amountUsd: monthToDateUsd },
  ];

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Ventas del día vs. mes</h2>
          <p className="analytics-panel-desc">
            Comparación rápida · hoy vs. acumulado del mes
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>

      <div
        className="analytics-chart analytics-chart-compare"
        role="img"
        aria-label="Gráfico de barras: ventas de hoy versus ventas del mes"
      >
        {bars.map((bar) => {
          const heightPct = Math.max(8, Math.round((bar.amountUsd / maxAmount) * 100));
          return (
            <div key={bar.key} className="analytics-chart-column">
              <p className="analytics-chart-amount">{formatUsd(bar.amountUsd)}</p>
              <div className="analytics-chart-bar-track analytics-chart-bar-track-tall">
                <div
                  className={`analytics-chart-bar ${
                    bar.key === "today" ? "analytics-chart-bar-today" : ""
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`${bar.label}: ${formatUsd(bar.amountUsd)}`}
                />
              </div>
              <p className="analytics-chart-label">{bar.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RegistrationRateCard({
  metrics,
}: {
  metrics: StoreAnalyticsPanel["registrationMetrics"];
}) {
  const rateDisplay = metrics.trackingEnabled
    ? `${metrics.registrationRatePct.toFixed(1)}%`
    : "—";

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Tasa de registro</h2>
          <p className="analytics-panel-desc">
            Visitantes del catálogo que crean cuenta · últimos {metrics.periodDays} días
          </p>
        </div>
        <UserPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>

      <div className="analytics-registration-rate">
        <p className="analytics-registration-rate-value">{rateDisplay}</p>
        <p className="analytics-registration-rate-caption">
          {metrics.registrations} registro{metrics.registrations !== 1 ? "s" : ""} de{" "}
          {metrics.uniqueVisitors} visitante
          {metrics.uniqueVisitors !== 1 ? "s" : ""}
        </p>
      </div>

      <dl className="analytics-registration-stats">
        <div>
          <dt>Visitantes únicos</dt>
          <dd>{metrics.uniqueVisitors}</dd>
        </div>
        <div>
          <dt>Nuevos clientes</dt>
          <dd>{metrics.newCustomerProfiles}</dd>
        </div>
      </dl>

      {!metrics.trackingEnabled ? (
        <p className="analytics-registration-note">
          El tracking de visitas acaba de activarse. En unos días verás la tasa real
          cuando haya tráfico en tu catálogo.
        </p>
      ) : metrics.registrationRatePct >= 5 ? (
        <p className="analytics-registration-note analytics-registration-note-positive">
          Buena señal: el banner y las promos exclusivas están atrayendo registros.
        </p>
      ) : null}
    </section>
  );
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const { salesComparison, topProducts, registrationMetrics } = analytics;

  return (
    <div className="space-y-6">
      <DayVsMonthSalesChart salesComparison={salesComparison} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Top productos</h2>
              <p className="analytics-panel-desc">
                Lo que más se mueve · ventas registradas y pedidos
              </p>
            </div>
            <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>

          {topProducts.length === 0 ? (
            <p className="analytics-empty-state">
              Aún no hay ventas. Cuando lleguen pedidos, verás aquí tus productos estrella.
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

        <RegistrationRateCard metrics={registrationMetrics} />
      </div>
    </div>
  );
}
