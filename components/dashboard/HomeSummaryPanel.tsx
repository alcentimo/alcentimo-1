import Link from "next/link";
import { AlertTriangle, ClipboardList, Package } from "lucide-react";
import type { HomeSummary } from "@/lib/dashboard/get-home-summary";

interface HomeSummaryPanelProps {
  summary: HomeSummary;
  storeName: string;
}

export function HomeSummaryPanel({ summary, storeName }: HomeSummaryPanelProps) {
  const primaryKpis = [
    {
      label: "Productos en catálogo",
      value: String(summary.productCount),
      hint: storeName,
      href: "/dashboard/inventario",
      icon: Package,
      tone: "default" as const,
    },
    {
      label: "Pedidos",
      value: "Gestionar",
      hint: "Revisa pedidos del catálogo público",
      href: "/dashboard/pedidos",
      icon: ClipboardList,
      tone: "default" as const,
    },
  ];

  const stockKpis = [
    {
      label: "Agotados",
      value: String(summary.outOfStockCount),
      hint: summary.outOfStockCount > 0 ? "Requieren reposición" : "Sin agotados",
      href: "/dashboard/inventario",
      icon: AlertTriangle,
      tone: summary.outOfStockCount > 0 ? ("warning" as const) : ("default" as const),
    },
    {
      label: "Stock bajo",
      value: String(summary.lowStockCount),
      hint:
        summary.lowStockCount > 0 ? "Cerca del umbral" : "Niveles saludables",
      href: "/dashboard/inventario",
      icon: Package,
      tone:
        summary.lowStockCount > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {primaryKpis.map((kpi) => (
          <KpiLinkCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <section>
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Catálogo
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Resumen de stock — detalle en Catálogo.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stockKpis.map((kpi) => (
            <KpiLinkCard key={kpi.label} {...kpi} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiLinkCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: typeof Package;
  tone: "default" | "warning" | "success";
  compact?: boolean;
}) {
  return (
    <Link href={href} className="kpi-card block transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p
            className={`mt-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            {value}
          </p>
          <p
            className={`mt-1 text-xs font-medium ${
              tone === "warning"
                ? "text-amber-700 dark:text-amber-400"
                : tone === "success"
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {hint}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
            tone === "warning"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : tone === "success"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
