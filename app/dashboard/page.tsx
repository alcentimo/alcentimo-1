import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getHomeSummary } from "@/lib/dashboard/get-home-summary";
import { getStoreInventory } from "@/lib/inventory";
import { InventoryAlerts } from "@/components/dashboard/InventoryAlerts";
import { HomeSummaryPanel } from "@/components/dashboard/HomeSummaryPanel";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);
  const params = await searchParams;
  const showOnboardingSuccess = params.onboarded === "1";

  if (!session) {
    redirect("/dashboard/login");
  }

  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Inicio</p>
          <h1 className="page-header-title">Resumen del negocio</h1>
          <p className="page-header-desc">
            Crea tu tienda para ver ventas, mensajes e inventario en un solo lugar.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [summary, inventory] = await Promise.all([
    getHomeSummary(supabase, store.id, store.slug),
    getStoreInventory(store.slug),
  ]);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      {showOnboardingSuccess ? (
        <div className="alert-success mb-6" role="status">
          ¡Tu tienda está lista! Ya puedes publicar productos y recibir pedidos por
          WhatsApp.
        </div>
      ) : null}

      <header className="page-header">
        <p className="section-label">Inicio</p>
        <h1 className="page-header-title">Resumen del negocio</h1>
        <p className="page-header-desc">
          Catálogo y pedidos de {store.name} en un vistazo.
        </p>
      </header>

      <HomeSummaryPanel summary={summary} storeName={store.name} />

      {summary.outOfStockCount > 0 || summary.lowStockCount > 0 ? (
        <section className="mt-8">
          <InventoryAlerts products={inventory.products} />
        </section>
      ) : null}

      <section className="mt-8">
        <div className="card-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Acceso rápido
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Publica productos y atiende clientes desde un solo lugar.
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
