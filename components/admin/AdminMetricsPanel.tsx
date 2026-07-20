import type { AdminPlanMetrics } from "@/lib/admin/get-admin-metrics";

const PLAN_ROWS: Array<{
  key: keyof AdminPlanMetrics["byPlan"];
  label: string;
  hint: string;
}> = [
  { key: "FREE", label: "Gratis", hint: "Plan Free" },
  { key: "PRO", label: "Pro", hint: "Plan Pro" },
  { key: "BUSINESS", label: "Business", hint: "Plan Business" },
];

interface AdminMetricsPanelProps {
  metrics: AdminPlanMetrics;
}

export function AdminMetricsPanel({ metrics }: AdminMetricsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Total de usuarios registrados
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {metrics.totalUsers}
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Filas en public.profiles
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Usuarios por plan
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {PLAN_ROWS.map((row) => (
            <li
              key={row.key}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {row.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.byPlan[row.key]}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {row.hint}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
