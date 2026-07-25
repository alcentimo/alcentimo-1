import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
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
  { key: "PRO", label: "Pro" },
  { key: "BUSINESS", label: "Business" },
  { key: "ENTERPRISE", label: "Enterprise" },
];

interface AdminOverviewPanelProps {
  metrics: AdminPlanMetrics;
  pendingMessages: number;
}

export function AdminOverviewPanel({
  metrics,
  pendingMessages,
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

      <AdminAiAssistantPanel />
    </div>
  );
}
