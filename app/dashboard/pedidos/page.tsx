import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { OrdersPanel } from "@/components/dashboard/orders/OrdersPanel";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/pedidos");
  }

  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Pedidos</p>
          <h1 className="page-header-title">Pedidos del catálogo</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para recibir pedidos del catálogo público.
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

  const orders = await getStoreOrders(store.id, 200);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Catálogo transaccional</p>
        <h1 className="page-header-title">Pedidos</h1>
        <p className="page-header-desc">
          Central operativa de pedidos desde{" "}
          <Link
            href={`/c/${store.slug}`}
            className="font-medium text-teal-700 hover:underline dark:text-teal-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            /c/{store.slug}
          </Link>
          . Gestiona estados, contacta clientes y revisa comprobantes sin salir de Alcentimo.
        </p>
      </header>

      <OrdersPanel orders={orders} />
    </PageContainer>
  );
}
