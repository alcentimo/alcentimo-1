import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Eye,
  MousePointerClick,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { StoreAnalyticsPanel } from "@/lib/analytics/types";
import { DashboardProductThumb } from "@/components/dashboard/DashboardProductThumb";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import { DashboardEmptyMetric } from "@/components/dashboard/DashboardEmptyMetric";
import { AnalyticsDateRangePicker } from "@/components/dashboard/analytics/AnalyticsDateRangePicker";
import { AnalyticsTrendBadge } from "@/components/dashboard/analytics/AnalyticsTrendBadge";

interface AnalyticsPanelProps {
  analytics: StoreAnalyticsPanel;
}

function KpiWithTrend({
  label,
  value,
  icon,
  metric,
  preset,
  caption,
  emptyHint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  metric: StoreAnalyticsPanel["financialKpis"]["periodSalesUsd"];
  preset: StoreAnalyticsPanel["dateRange"]["preset"];
  caption?: string;
  emptyHint?: string;
}) {
  return (
    <div className="analytics-kpi-with-trend">
      <DashboardKpiCard
        label={label}
        value={value}
        icon={icon}
        caption={caption}
        emptyHint={emptyHint}
      />
      <AnalyticsTrendBadge metric={metric} preset={preset} />
    </div>
  );
}

function SalesTrendChart({
  salesTrend,
  dateRange,
}: {
  salesTrend: StoreAnalyticsPanel["salesTrend"];
  dateRange: StoreAnalyticsPanel["dateRange"];
}) {
  const hasSales = salesTrend.some((day) => day.amountUsd > 0);
  const maxAmount = Math.max(...salesTrend.map((day) => day.amountUsd), 1);
  const columnClass =
    salesTrend.length <= 7
      ? "analytics-chart"
      : "analytics-chart analytics-chart-dense";

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Tendencia de ventas</h2>
          <p className="analytics-panel-desc">
            {dateRange.label} · pedidos y ventas registradas
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>

      {!hasSales ? (
        <DashboardEmptyMetric
          icon={BarChart3}
          title="Sin ventas en este periodo"
          description="Comparte tu catálogo o registra ventas manuales para ver la tendencia aquí."
        />
      ) : (
        <div
          className={columnClass}
          role="img"
          aria-label={`Gráfico de ventas del ${dateRange.label}`}
        >
          {salesTrend.map((day) => {
            const heightPct =
              day.amountUsd <= 0
                ? 0
                : Math.max(8, Math.round((day.amountUsd / maxAmount) * 100));

            return (
              <div key={day.date} className="analytics-chart-column">
                <p className="analytics-chart-amount">
                  {day.amountUsd > 0 ? formatUsd(day.amountUsd) : "—"}
                </p>
                <div className="analytics-chart-bar-track">
                  {day.amountUsd > 0 ? (
                    <div
                      className="analytics-chart-bar"
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${formatUsd(day.amountUsd)}`}
                    />
                  ) : (
                    <div className="analytics-chart-bar-empty" aria-hidden="true" />
                  )}
                </div>
                <p className="analytics-chart-label">{day.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProductInsightList({
  products,
  mode,
}: {
  products: StoreAnalyticsPanel["topProductsByUnits"];
  mode: "units" | "revenue";
}) {
  if (products.length === 0) {
    return (
      <DashboardEmptyMetric
        icon={Package}
        title="Sin datos de productos"
        description="Cuando haya ventas en el periodo seleccionado, verás aquí los productos destacados."
        compact
      />
    );
  }

  return (
    <ul className="analytics-insight-list">
      {products.map((product, index) => (
        <li key={product.productId} className="analytics-insight-item">
          <span className="analytics-rank">{index + 1}</span>
          <DashboardProductThumb name={product.name} thumbUrl={product.thumbUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {product.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {mode === "units"
                ? `${product.unitsSold} unidad${product.unitsSold !== 1 ? "es" : ""}`
                : formatUsd(product.revenueUsd)}
              {mode === "revenue" && product.unitsSold > 0
                ? ` · ${product.unitsSold} u.`
                : mode === "units" && product.revenueUsd > 0
                  ? ` · ${formatUsd(product.revenueUsd)}`
                  : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrafficMetricsPanel({
  metrics,
  preset,
}: {
  metrics: StoreAnalyticsPanel["trafficMetrics"];
  preset: StoreAnalyticsPanel["dateRange"]["preset"];
}) {
  if (!metrics.trackingEnabled) {
    return (
      <section className="analytics-panel">
        <div className="analytics-panel-header">
          <div>
            <h2 className="analytics-panel-title">Tráfico y conversión</h2>
            <p className="analytics-panel-desc">
              Visitas al catálogo, pedidos y registros de clientes
            </p>
          </div>
          <Eye className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        </div>
        <DashboardEmptyMetric
          icon={Eye}
          title="Medición en preparación"
          description="Comparte tu catálogo para empezar a medir visitas, conversión y registros."
          compact
        />
      </section>
    );
  }

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Tráfico y conversión</h2>
          <p className="analytics-panel-desc">
            Visitas, pedidos/WhatsApp y registros de clientes
          </p>
        </div>
        <Eye className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>

      <div className="analytics-traffic-grid">
        <article className="analytics-traffic-card">
          <div className="analytics-traffic-card-header">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Visitas al catálogo</span>
          </div>
          <p className="analytics-traffic-value">{metrics.uniqueVisitors.value}</p>
          <AnalyticsTrendBadge metric={metrics.uniqueVisitors} preset={preset} />
        </article>

        <article className="analytics-traffic-card">
          <div className="analytics-traffic-card-header">
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span>Tasa de conversión</span>
          </div>
          <p className="analytics-traffic-value">
            {metrics.conversionRatePct.value.toFixed(1)}%
          </p>
          <p className="analytics-traffic-caption">
            {metrics.conversionActions} pedido{metrics.conversionActions !== 1 ? "s" : ""} o venta
            WhatsApp
          </p>
          <AnalyticsTrendBadge metric={metrics.conversionRatePct} preset={preset} />
        </article>

        <article className="analytics-traffic-card">
          <div className="analytics-traffic-card-header">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Tasa de registro</span>
          </div>
          <p className="analytics-traffic-value">
            {metrics.registrationRatePct.value.toFixed(1)}%
          </p>
          <p className="analytics-traffic-caption">
            {metrics.registrations} registro{metrics.registrations !== 1 ? "s" : ""} ·{" "}
            {metrics.newCustomerProfiles} perfil
            {metrics.newCustomerProfiles !== 1 ? "es" : ""} nuevos
          </p>
          <AnalyticsTrendBadge metric={metrics.registrationRatePct} preset={preset} />
        </article>
      </div>
    </section>
  );
}

function StagnantProductsPanel({
  products,
}: {
  products: StoreAnalyticsPanel["stagnantProducts"];
}) {
  return (
    <section className="analytics-panel analytics-panel-warning">
      <div className="analytics-panel-header">
        <div>
          <h2 className="analytics-panel-title">Inventario estancado</h2>
          <p className="analytics-panel-desc">
            Productos con stock y cero ventas en los últimos 30 días
          </p>
        </div>
        <span className="analytics-warning-badge">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {products.length > 0 ? `${products.length} alerta${products.length !== 1 ? "s" : ""}` : "Sin alertas"}
        </span>
      </div>

      {products.length === 0 ? (
        <DashboardEmptyMetric
          icon={Package}
          title="Inventario en movimiento"
          description="No hay productos con stock parado. Buen signo: todo lo disponible ha tenido ventas recientes."
          compact
        />
      ) : (
        <>
          <p className="analytics-stagnant-tip">
            Considera promociones, combos o destacarlos en tu catálogo para liberar capital.
          </p>
          <ul className="analytics-insight-list">
            {products.map((product) => (
              <li key={product.productId} className="analytics-insight-item">
                <DashboardProductThumb name={product.name} thumbUrl={product.thumbUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {product.availableStock} en stock · 0 ventas (30 días)
                  </p>
                </div>
                <Link
                  href={`/dashboard/catalogo?q=${encodeURIComponent(product.name)}`}
                  className="analytics-insight-link"
                >
                  Ver en catálogo
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const {
    dateRange,
    financialKpis,
    trafficMetrics,
    salesTrend,
    topProductsByUnits,
    topProductsByRevenue,
    stagnantProducts,
  } = analytics;

  return (
    <div className="space-y-6">
      <AnalyticsDateRangePicker dateRange={dateRange} />

      <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
        <KpiWithTrend
          label="Ventas del periodo"
          value={formatUsd(financialKpis.periodSalesUsd.value)}
          icon={TrendingUp}
          metric={financialKpis.periodSalesUsd}
          preset={dateRange.preset}
          emptyHint="Sin ventas en este periodo"
        />
        <KpiWithTrend
          label="Ticket promedio"
          value={formatUsd(financialKpis.averageOrderValueUsd.value)}
          icon={Receipt}
          metric={financialKpis.averageOrderValueUsd}
          preset={dateRange.preset}
          emptyHint="Calculado con pedidos y ventas"
        />
        <KpiWithTrend
          label="Transacciones"
          value={String(financialKpis.transactionCount.value)}
          icon={ShoppingBag}
          metric={financialKpis.transactionCount}
          preset={dateRange.preset}
          emptyHint="Pedidos y ventas registradas"
        />
        <div className="analytics-kpi-with-trend analytics-kpi-context">
          <DashboardKpiCard
            label="Ventas hoy"
            value={formatUsd(financialKpis.todaySalesUsd)}
            icon={BarChart3}
            caption={`Acumulado mes: ${formatUsd(financialKpis.monthToDateUsd)}`}
            emptyHint="Aún no hay ventas hoy"
          />
        </div>
      </div>

      <SalesTrendChart salesTrend={salesTrend} dateRange={dateRange} />

      <TrafficMetricsPanel metrics={trafficMetrics} preset={dateRange.preset} />

      <div className="dashboard-metrics-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Top por unidades</h2>
              <p className="analytics-panel-desc">Los productos que más se venden</p>
            </div>
            <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>
          <ProductInsightList products={topProductsByUnits} mode="units" />
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Top por ingresos</h2>
              <p className="analytics-panel-desc">Lo que más dinero genera</p>
            </div>
            <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>
          <ProductInsightList products={topProductsByRevenue} mode="revenue" />
        </section>
      </div>

      <StagnantProductsPanel products={stagnantProducts} />
    </div>
  );
}
