"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { CatalogLinkCard } from "@/components/dashboard/settings/CatalogLinkCard";
import { HomePriorities } from "@/components/dashboard/home/HomePriorities";
import type { HomeSummary } from "@/lib/dashboard/get-home-summary";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogOrder } from "@/lib/orders/types";
import { formatUsd } from "@/lib/format";

interface DashboardHomePanelProps {
  summary: HomeSummary;
  storeName: string;
  storeSlug: string;
  outOfStockProducts: CatalogListItem[];
  pendingOrders: CatalogOrder[];
}

export function DashboardHomePanel({
  summary,
  storeName,
  storeSlug,
  outOfStockProducts,
  pendingOrders,
}: DashboardHomePanelProps) {
  const kpis = [
    {
      label: "Total productos",
      value: String(summary.productCount),
      href: "/dashboard/inventario",
    },
    {
      label: "Pedidos pendientes",
      value: String(summary.pendingCatalogOrders),
      href: "/dashboard/pedidos",
    },
    {
      label: "Total ventas (mes)",
      value: formatUsd(summary.monthSalesTotal),
      href: "/dashboard/ventas",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Hola, {storeName}
        </h1>
      </header>

      <CatalogLinkCard slug={storeSlug} variant="dashboard" />

      <section aria-label="Indicadores clave">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                {kpi.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <HomePriorities
        outOfStockProducts={outOfStockProducts}
        pendingOrders={pendingOrders}
      />

      <section aria-label="Acceso rápido">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand inline-flex min-h-12 flex-1 items-center justify-center gap-2 px-5 text-base font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Link>
          <Link
            href="/dashboard/pedidos"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-base font-semibold text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar pedido
          </Link>
        </div>
      </section>
    </div>
  );
}
