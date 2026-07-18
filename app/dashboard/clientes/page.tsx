import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { CustomersPanel } from "@/components/dashboard/customers/CustomersPanel";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreCustomers } from "@/lib/customers/get-store-customers";
import { createClient } from "@/lib/supabase/server";
import { getTransactionalCatalogPublicUrl } from "@/lib/stores";
import { isStoreOwner } from "@/lib/stores/owner-access";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/clientes");
  }

  const { authUser, store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Clientes</p>
          <h1 className="page-header-title">Mis Clientes</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para ver a tus clientes registrados.
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

  if (!isStoreOwner(store, authUser.id)) {
    redirect("/dashboard/catalogo");
  }

  const customers = await getStoreCustomers(store.id);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Relación con clientes</p>
        <h1 className="page-header-title">Mis Clientes</h1>
        <p className="page-header-desc">
          Personas registradas en{" "}
          <Link
            href={getTransactionalCatalogPublicUrl(store.slug)}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            {new URL(getTransactionalCatalogPublicUrl(store.slug)).host}
          </Link>
          . Los totales incluyen pedidos vinculados a su cuenta.
        </p>
      </header>

      <CustomersPanel customers={customers} storeName={store.name} />
    </PageContainer>
  );
}
