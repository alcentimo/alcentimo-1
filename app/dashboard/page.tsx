import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Package, AlertTriangle, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreInventory } from "@/lib/inventory";
import { countOutOfStock, countLowStock } from "@/lib/inventory/stock-status";
import { InventoryAlerts } from "@/components/dashboard/InventoryAlerts";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login");
  }

  const { store } = session;

  let productCount = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let alertProducts: Awaited<ReturnType<typeof getStoreInventory>>["products"] = [];

  if (store) {
    const inventory = await getStoreInventory(store.slug);
    alertProducts = inventory.products;
    productCount = inventory.products.length;
    outOfStockCount = countOutOfStock(inventory.products);
    lowStockCount = countLowStock(inventory.products);
  }

  const kpis = [
    {
      label: "Total productos",
      value: String(productCount),
      hint: store ? `Tienda ${store.name}` : "Sin tienda",
      icon: Package,
      tone: "default" as const,
    },
    {
      label: "Productos agotados",
      value: String(outOfStockCount),
      hint: outOfStockCount > 0 ? "Requieren reposición" : "Sin agotados",
      icon: AlertTriangle,
      tone: "warning" as const,
    },
    {
      label: "Stock bajo",
      value: String(lowStockCount),
      hint: lowStockCount > 0 ? "Cerca del umbral" : "Niveles saludables",
      icon: DollarSign,
      tone: lowStockCount > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Centro de mando</p>
        <h1 className="page-header-title">Inicio</h1>
        <p className="page-header-desc">
          Resumen de inventario y acceso rápido a tu catálogo
          {store ? ` · ${store.name}` : ""}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className="kpi-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {kpi.value}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      kpi.tone === "warning"
                        ? "text-amber-700 dark:text-amber-400"
                        : kpi.tone === "success"
                          ? "text-teal-700 dark:text-teal-400"
                          : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {kpi.hint}
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                    kpi.tone === "warning"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      : kpi.tone === "success"
                        ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-8">
        <InventoryAlerts products={alertProducts} />
      </section>

      <section className="mt-8">
        <div className="card-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Acceso rápido
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Publica un producto y aparece al instante en tu catálogo público.
            </p>
          </div>
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand w-full gap-2 shadow-sm sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
