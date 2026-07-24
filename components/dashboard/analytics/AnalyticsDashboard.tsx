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
import { DashboardProductThumb } from "@/components/dashboard/DashboardProductThumb";
import { DashboardEmptyMetric } from "@/components/dashboard/DashboardEmptyMetric";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";

interface AnalyticsDashboardProps {
  analytics: StoreAnalytics;
}

function WeeklySalesChart({
  weeklySales,
}: {
  weeklySales: StoreAnalytics["weeklySales"];
}) {
  const hasSales = weeklySales.some((day) => day.amountUsd > 0);
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

      {!hasSales ? (
        <DashboardEmptyMetric
          icon={BarChart3}
          title="Sin actividad reciente"
          description="Los últimos 7 días no registran ventas. Comparte tu catálogo para impulsar pedidos."
        />
      ) : (
        <div className="analytics-chart" role="img" aria-label="Gráfico de barras de ventas semanales">
          {weeklySales.map((day) => {
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

/** @deprecated Usar AnalyticsPanel en /dashboard/analiticas. */
export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const { kpis, weeklySales, topProducts, lowStockProducts } = analytics;
  const inventoryTone =
    kpis.activeInventoryCount === 0
      ? "warning"
      : kpis.lowStockCount > 0
        ? "warning"
        : "default";

  return (
    <div className="space-y-6">
      <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
        <Link href="/dashboard/ventas" className="block">
          <DashboardKpiCard
            label="Ventas totales"
            value={formatUsd(kpis.totalSalesUsd)}
            icon={TrendingUp}
            emptyHint="Sin ventas registradas"
            className="h-full transition-shadow hover:shadow-md"
          />
        </Link>
        <Link href="/dashboard/pedidos" className="block">
          <DashboardKpiCard
            label="Pedidos recibidos"
            value={String(kpis.ordersReceived)}
            icon={Receipt}
            emptyHint="Aún no hay pedidos"
            className="h-full transition-shadow hover:shadow-md"
          />
        </Link>
        <DashboardKpiCard
          label="Ticket promedio"
          value={formatUsd(kpis.averageTicketUsd)}
          icon={ShoppingBag}
          emptyHint="Se calcula con la primera venta"
        />
        <Link href="/dashboard/catalogo" className="block">
          <DashboardKpiCard
            label="Inventario activo"
            value={String(kpis.activeInventoryCount)}
            icon={Package}
            tone={inventoryTone}
            emptyHint="No hay productos con stock"
            className="h-full transition-shadow hover:shadow-md"
          />
        </Link>
      </div>

      <WeeklySalesChart weeklySales={weeklySales} />

      <div className="dashboard-metrics-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2 className="analytics-panel-title">Top 5 productos</h2>
              <p className="analytics-panel-desc">Los más vendidos para decidir qué reponer</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <DashboardEmptyMetric
              icon={Package}
              title="Sin productos destacados"
              description="Publica productos y registra tu primera venta para ver el ranking."
              compact
            />
          ) : (
            <ul className="analytics-insight-list">
              {topProducts.map((product, index) => (
                <li key={product.productId} className="analytics-insight-item">
                  <span className="analytics-rank">{index + 1}</span>
                  <DashboardProductThumb name={product.name} thumbUrl={product.thumbUrl} />
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
            <DashboardEmptyMetric
              icon={Package}
              title="Inventario saludable"
              description="No hay productos con stock crítico en este momento."
              compact
            />
          ) : (
            <ul className="analytics-insight-list">
              {lowStockProducts.map((product) => {
                const isOut = product.availableStock <= 0;
                return (
                  <li key={product.productId} className="analytics-insight-item">
                    <DashboardProductThumb name={product.name} thumbUrl={product.thumbUrl} />
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
                    <Link href="/dashboard/catalogo" className="analytics-insight-link">
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
