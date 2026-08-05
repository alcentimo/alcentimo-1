import Link from "next/link";
import { Eye, Package } from "lucide-react";
import type { CatalogVisitStats } from "@/lib/analytics/get-page-visit-stats";
import { cn } from "@/lib/cn";

interface CatalogVisitStatsCardProps {
  stats: CatalogVisitStats;
  className?: string;
}

export function CatalogVisitStatsCard({
  stats,
  className,
}: CatalogVisitStatsCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5",
        className,
      )}
      aria-label="Estadísticas del catálogo"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Estadísticas del catálogo
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Visitas a tu tienda pública
          </h2>
        </div>
        <Link
          href="/dashboard/analiticas"
          className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Ver analíticas →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide">
              Este mes
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {stats.monthUniqueVisitors.toLocaleString("es-VE")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            visitas únicas · {stats.monthPageViews.toLocaleString("es-VE")} vistas
          </p>
        </article>

        <article className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide">Hoy</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {stats.todayUniqueVisitors.toLocaleString("es-VE")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            visitas únicas · {stats.todayPageViews.toLocaleString("es-VE")} vistas
          </p>
        </article>

        <article className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500">
            <Package className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide">
              Más visto (mes)
            </p>
          </div>
          {stats.topProduct ? (
            <>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {stats.topProduct.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {stats.topProduct.views.toLocaleString("es-VE")} vistas
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              Aún sin vistas de productos
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
