import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrdersList } from "@/components/customers/CustomerOrdersList";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
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

  const [orders, catalogData] = await Promise.all([
    getCustomerOrdersForStore(store.id),
    getPublicCatalogPageData(store.slug),
  ]);
  const storeWhatsAppPhone =
    catalogData?.purchaseInfo.whatsappPhone?.trim() ||
    catalogData?.purchaseInfo.whatsappPhones.find((phone) => phone.trim())?.trim() ||
    null;

  return (
    <div className="catalog-subpage">
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Mis compras</h1>
        <p className="catalog-subpage-desc">
          Consulta el estado de tus pedidos en {store.name} y las guías de
          envío en tiempo real.
        </p>
      </header>

      <div className="card-panel">
        <CustomerOrdersList
          storeSlug={store.slug}
          storeId={store.id}
          userId={user.id}
          orders={orders}
          storeWhatsAppPhone={storeWhatsAppPhone}
        />
      </div>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm text-zinc-500">
        <Link
          href={getStoreCustomerAccountPath(store.slug, "perfil")}
          className="link-brand"
        >
          Mi perfil / Seguridad
        </Link>
        <Link href={getStoreCatalogBasePath(store.slug)} className="link-brand">
          Seguir comprando
        </Link>
      </p>
    </div>
  );
}
