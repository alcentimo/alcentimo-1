import { PageContainer } from "@/components/ui/PageContainer";
import { CustomersPanel } from "@/components/dashboard/customers/CustomersPanel";
import { getStoreCustomers } from "@/lib/customers/get-store-customers";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorClientesPage() {
  const { store } = await requireSupplierHubSession({
    requireOwnStorefront: true,
  });

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <p className="text-sm text-zinc-500">Preparando tu lista de clientes…</p>
      </PageContainer>
    );
  }

  const customers = await getStoreCustomers(store.id);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header customers-page-header">
        <p className="section-label">Relación con clientes</p>
        <h1 className="page-header-title">Mis Clientes</h1>
        <p className="page-header-desc">
          Compradores de tu vitrina pública de {store.name}.
        </p>
      </header>
      <CustomersPanel
        storeId={store.id}
        customers={customers}
        storeName={store.name}
      />
    </PageContainer>
  );
}
