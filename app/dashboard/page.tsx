import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getHomeSummary } from "@/lib/dashboard/get-home-summary";
import { getStoreInventory } from "@/lib/inventory";
import { isOutOfStock } from "@/lib/inventory/stock-status";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { DashboardHomePanel } from "@/components/dashboard/DashboardHomePanel";
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
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Hola
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Crea tu tienda para empezar a vender.
          </p>
        </header>
        <div className="mt-8">
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand inline-flex min-h-12 items-center gap-2 px-5 text-base font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [summary, inventory, orders] = await Promise.all([
    getHomeSummary(supabase, store.id, store.slug),
    getStoreInventory(store.slug),
    getStoreOrders(store.id, 50),
  ]);

  const outOfStockProducts = inventory.products.filter(isOutOfStock);
  const pendingOrders = orders.filter(
    (order) => order.estado === "pendiente" || order.estado === "verificando",
  );

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      {showOnboardingSuccess ? (
        <div className="alert-success mb-6" role="status">
          ¡Tu tienda está lista! Comparte tu enlace y publica tu primer producto.
        </div>
      ) : null}

      <DashboardHomePanel
        summary={summary}
        storeName={store.name}
        storeSlug={store.slug}
        outOfStockProducts={outOfStockProducts}
        pendingOrders={pendingOrders}
      />
    </PageContainer>
  );
}
