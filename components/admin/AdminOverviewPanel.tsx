import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  Eye,
  Store,
  Users,
} from "lucide-react";
import type { AdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import { AdminAiAssistantPanel } from "@/components/admin/AdminAiAssistantPanel";

const PLAN_ROWS: Array<{
  key: keyof AdminPlanMetrics["byPlan"];
  label: string;
}> = [
  { key: "FREE", label: "Gratis" },
  { key: "PRO", label: "Profesional" },
  { key: "BUSINESS", label: "Comercial" },
  { key: "ENTERPRISE", label: "Corporativo" },
];

interface AdminOverviewPanelProps {
  metrics: AdminPlanMetrics;
  pendingMessages: number;
  assistantEnabled?: boolean;
}

export function AdminOverviewPanel({
  metrics,
  pendingMessages,
  assistantEnabled = false,
}: AdminOverviewPanelProps) {
  const alerts = [
    metrics.pendingPayments > 0
      ? {
          label: `${metrics.pendingPayments} pago(s) pendiente(s) de revisión`,
          href: "/admin/dashboard?tab=pagos",
          tone: "amber" as const,
        }
      : null,
    pendingMessages > 0
      ? {
          label: `${pendingMessages} mensaje(s) de soporte sin atender`,
          href: "/admin/dashboard?tab=soporte",
          tone: "violet" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    tone: "amber" | "violet";
  }>;

  return (
    <div className="space-y-6">
      <Link
        href="/mercado-oculto"
        className="flex flex-col gap-1 rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-3 transition hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/30 dark:hover:border-teal-800"
      >
        <span className="text-sm font-semibold text-teal-900 dark:text-teal-100">
          Mercado oculto
        </span>
        <span className="text-xs text-teal-800/80 dark:text-teal-200/80">
          Abrir la vitrina interna de productos mayoristas (Super Admin).
        </span>
      </Link>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <div className="admin-kpi-card-icon admin-kpi-card-icon-emerald">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="admin-kpi-card-label">Usuarios registrados</p>
          <p className="admin-kpi-card-value">{metrics.totalUsers}</p>
        </article>

        <article className="admin-kpi-card">
          <div className="admin-kpi-card-icon admin-kpi-card-icon-teal">
            <Store className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="admin-kpi-card-label">Tiendas totales</p>
          <p className="admin-kpi-card-value">{metrics.totalStores}</p>
        </article>

        <article className="admin-kpi-card">
          <div className="admin-kpi-card-icon admin-kpi-card-icon-sky">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="admin-kpi-card-label">Visitas a alcentimo.com</p>
          <p className="admin-kpi-card-value">
            {metrics.landingVisitsTotal.toLocaleString("es-VE")}
          </p>
          <p className="admin-kpi-card-hint">
            {metrics.landingVisitsMonth.toLocaleString("es-VE")} este mes
          </p>
        </article>

        <article className="admin-kpi-card">
          <div className="admin-kpi-card-icon admin-kpi-card-icon-violet">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="admin-kpi-card-label">Ingresos verificados (USD)</p>
          <p className="admin-kpi-card-value">
            ${metrics.verifiedPaymentsUsd.toLocaleString("es-VE")}
          </p>
          <p className="admin-kpi-card-hint">Suma de pagos manuales aprobados</p>
        </article>

        <article className="admin-kpi-card">
          <div className="admin-kpi-card-icon admin-kpi-card-icon-amber">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="admin-kpi-card-label">Alertas operativas</p>
          <p className="admin-kpi-card-value">
            {metrics.pendingPayments + pendingMessages}
          </p>
          <p className="admin-kpi-card-hint">Pagos + soporte pendientes</p>
        </article>
      </div>

      {alerts.length > 0 ? (
        <div className="admin-alert-list">
          {alerts.map((alert) => (
            <Link
              key={alert.href}
              href={alert.href}
              className={
                alert.tone === "amber"
                  ? "admin-alert-item admin-alert-item-amber"
                  : "admin-alert-item admin-alert-item-violet"
              }
            >
              {alert.label}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="admin-panel-section" aria-label="Métricas de tráfico global">
        <h3 className="admin-panel-section-title">Métricas de Tráfico Global</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2 text-zinc-500">
              <Eye className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wide">
                Landing alcentimo.com
              </p>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {metrics.landingVisitsTotal.toLocaleString("es-VE")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              visitas únicas totales
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {metrics.landingVisitsMonth.toLocaleString("es-VE")} este mes
            </p>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top 5 tiendas más visitadas este mes
            </p>
            {metrics.topStoresThisMonth.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {metrics.topStoresThisMonth.map((store, index) => (
                  <li
                    key={store.storeId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        <span className="mr-1.5 text-zinc-400">{index + 1}.</span>
                        {store.storeName}
                      </p>
                      {store.storeSlug ? (
                        <p className="truncate text-xs text-zinc-400">
                          /{store.storeSlug}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                      {store.monthVisits.toLocaleString("es-VE")}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Aún no hay visitas de catálogo este mes.
              </p>
            )}
            <Link
              href="/admin/dashboard?tab=tiendas"
              className="mt-3 inline-block text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
            >
              Ver todas las tiendas →
            </Link>
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="admin-panel-section">
          <h3 className="admin-panel-section-title">Usuarios por plan</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLAN_ROWS.map((row) => (
              <li key={row.key} className="admin-plan-stat">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {row.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {metrics.byPlan[row.key]}
                </p>
                <Link
                  href={`/admin/dashboard?tab=tiendas&plan=${row.key}`}
                  className="mt-2 inline-block text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
                >
                  Ver usuarios →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel-section">
          <h3 className="admin-panel-section-title">Tiendas por plan del dueño</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLAN_ROWS.map((row) => (
              <li key={row.key} className="admin-plan-stat">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {row.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {metrics.storesByPlan[row.key]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AdminAiAssistantPanel
        assistantEnabled={assistantEnabled}
        variant="compact"
      />
    </div>
  );
}
