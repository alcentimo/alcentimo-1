import { BarChart3, Package, TrendingUp, UserPlus } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { StoreAnalyticsPanel } from "@/lib/analytics/types";
import { DashboardProductThumb } from "@/components/dashboard/DashboardProductThumb";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import { DashboardEmptyMetric } from "@/components/dashboard/DashboardEmptyMetric";

interface AnalyticsPanelProps {
  analytics: StoreAnalyticsPanel;
}

function AnalyticsKpiRow({
  salesComparison,
  registrationMetrics,
}: {
  salesComparison: StoreAnalyticsPanel["salesComparison"];
  registrationMetrics: StoreAnalyticsPanel["registrationMetrics"];
}) {
  const registrationValue = registrationMetrics.trackingEnabled
    ? `${registrationMetrics.registrationRatePct.toFixed(1)}%`
    : "—";

  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-3">
      <DashboardKpiCard
        label="Ventas hoy"
        value={formatUsd(salesComparison.todayUsd)}
        icon={TrendingUp}
        emptyHint="Aún no hay ventas hoy"
      />
      <DashboardKpiCard
        label={`Ventas ${salesComparison.monthLabel}`}
        value={formatUsd(salesComparison.monthToDateUsd)}
        icon={BarChart3}
        emptyHint="Sin ventas acumuladas este mes"
      />
      <DashboardKpiCard
        label="Tasa de registro"
        value={registrationValue}
        icon={UserPlus}
        caption={
          registrationMetrics.trackingEnabled
            ? `${registrationMetrics.registrations} de ${registrationMetrics.uniqueVisitors} visitantes`
            : `Últimos ${registrationMetrics.periodDays} días`
        }
        emptyHint={
          registrationMetrics.trackingEnabled
            ? "Sin conversiones todavía"
            : "Esperando tráfico en el catálogo"
        }
      />
    </div>
  );
}

function DayVsMonthSalesChart({
  salesComparison,
}: {
  salesComparison: StoreAnalyticsPanel["salesComparison"];
}) {
  const { todayUsd, monthToDateUsd, todayLabel, monthLabel } = salesComparison;
  const hasSales = todayUsd > 0 || monthToDateUsd > 0;
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

      {!hasSales ? (
        <DashboardEmptyMetric
          icon={TrendingUp}
          title="Sin ventas registradas"
          description="Cuando recibas pedidos o registres ventas, verás aquí la comparación diaria y mensual."
        />
      ) : (
        <div
          className="analytics-chart analytics-chart-compare"
          role="img"
          aria-label="Gráfico de barras: ventas de hoy versus ventas del mes"
        >
          {bars.map((bar) => {
            const heightPct =
              bar.amountUsd <= 0
                ? 0
                : Math.max(12, Math.round((bar.amountUsd / maxAmount) * 100));

            return (
              <div key={bar.key} className="analytics-chart-column">
                <p className="analytics-chart-amount">
                  {bar.amountUsd > 0 ? formatUsd(bar.amountUsd) : "—"}
                </p>
                <div className="analytics-chart-bar-track analytics-chart-bar-track-tall">
                  {bar.amountUsd > 0 ? (
                    <div
                      className={`analytics-chart-bar ${
                        bar.key === "today" ? "analytics-chart-bar-today" : ""
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${bar.label}: ${formatUsd(bar.amountUsd)}`}
                    />
                  ) : (
                    <div className="analytics-chart-bar-empty" aria-hidden="true" />
                  )}
                </div>
                <p className="analytics-chart-label">{bar.label}</p>
              </div>
            );
          })}
        </div>
      )}
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
  const hasActivity =
    metrics.trackingEnabled &&
    (metrics.uniqueVisitors > 0 || metrics.registrations > 0);

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

      {!metrics.trackingEnabled ? (
        <DashboardEmptyMetric
          icon={UserPlus}
          title="Medición en preparación"
          description="El tracking de visitas acaba de activarse. En unos días verás la tasa real cuando haya tráfico en tu catálogo."
          compact
        />
      ) : !hasActivity ? (
        <DashboardEmptyMetric
          icon={UserPlus}
          title="Sin visitantes todavía"
          description="Comparte tu catálogo para empezar a medir cuántos clientes crean cuenta."
          compact
        />
      ) : (
        <>
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

          {metrics.registrationRatePct >= 5 ? (
            <p className="analytics-registration-note analytics-registration-note-positive">
              Buena señal: el banner y las promos exclusivas están atrayendo registros.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const { salesComparison, topProducts, registrationMetrics } = analytics;

  return (
    <div className="space-y-6">
      <AnalyticsKpiRow
        salesComparison={salesComparison}
        registrationMetrics={registrationMetrics}
      />

      <DayVsMonthSalesChart salesComparison={salesComparison} />

      <div className="dashboard-metrics-grid">
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
            <DashboardEmptyMetric
              icon={Package}
              title="Aún no hay productos estrella"
              description="Cuando lleguen pedidos o ventas, verás aquí qué artículos lideran."
              compact
            />
          ) : (
            <ul className="analytics-insight-list">
              {topProducts.map((product, index) => (
                <li key={product.productId} className="analytics-insight-item">
                  <span className="analytics-rank">{index + 1}</span>
                  <DashboardProductThumb
                    name={product.name}
                    thumbUrl={product.thumbUrl}
                  />
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
