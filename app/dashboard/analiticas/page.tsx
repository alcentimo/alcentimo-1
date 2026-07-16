import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getHomeSummary } from "@/lib/dashboard/get-home-summary";
import { formatUsd } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnaliticasPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/analiticas");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const summary = await getHomeSummary(supabase, store.id, store.slug);

  const metrics = [
    {
      label: "Productos activos",
      value: String(summary.productCount),
      href: "/dashboard/catalogo?tab=inventario",
    },
    {
      label: "Órdenes pendientes",
      value: String(summary.pendingCatalogOrders),
      href: "/dashboard/pedidos",
    },
    {
      label: "Ventas del mes",
      value: formatUsd(summary.monthSalesTotal),
      href: "/dashboard/ventas",
    },
    {
      label: "Sin stock",
      value: String(summary.outOfStockCount),
      href: "/dashboard/catalogo?tab=inventario",
    },
  ];

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Inteligencia de negocio</p>
        <h1 className="page-header-title">Analíticas</h1>
        <p className="page-header-desc">
          Indicadores operativos de {store.name} para decisiones comerciales en
          tiempo real.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="card-panel transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {metric.value}
            </p>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
