import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreSales } from "@/lib/sales/get-store-sales";
import { SalesPanel } from "@/components/dashboard/sales/SalesPanel";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/ventas");
  }

  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Ventas</p>
          <h1 className="page-header-title">Registro de ventas</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para registrar ventas multicanal.
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

  const [{ products, exchangeRate }, sales] = await Promise.all([
    getStoreInventory(store.slug),
    getStoreSales(store.id, 200),
  ]);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Inteligencia de negocio</p>
        <h1 className="page-header-title">Reportes</h1>
        <p className="page-header-desc">
          Historial de ventas y pedidos de {store.name} para análisis operativo y
          seguimiento comercial.
        </p>
      </header>

      <SalesPanel
        products={products}
        sales={sales}
        exchangeRate={exchangeRate?.rate ?? null}
      />
    </PageContainer>
  );
}
