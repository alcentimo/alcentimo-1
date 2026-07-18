import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrdersList } from "@/components/customers/CustomerOrdersList";
import { getCustomerOrdersForStore } from "@/lib/customers/get-customer-orders";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getStoreCatalogBasePath, getStoreCustomerAccountPath } from "@/lib/store-host";
import { getPublicStoreBySlug } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CustomerAccountPageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function CustomerAccountPage({
  params,
}: CustomerAccountPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      buildCustomerRegisterPath(
        store.slug,
        getStoreCustomerAccountPath(store.slug, "cuenta"),
      ),
    );
  }

  const orders = await getCustomerOrdersForStore(store.id);

  return (
    <div className="catalog-subpage">
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Mis Pedidos</h1>
        <p className="catalog-subpage-desc">
          Historial de compras en {store.name}.
        </p>
      </header>

      <div className="card-panel">
        <CustomerOrdersList orders={orders} />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href={getStoreCatalogBasePath(store.slug)} className="link-brand">
          Seguir comprando
        </Link>
      </p>
    </div>
  );
}
