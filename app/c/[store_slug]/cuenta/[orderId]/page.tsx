import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrderDetail } from "@/components/customers/CustomerOrderDetail";
import { getCustomerOrderForStore } from "@/lib/customers/get-customer-orders";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import { getPublicStoreBySlug } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CustomerOrderDetailPageProps {
  params: Promise<{ store_slug: string; orderId: string }>;
}

export default async function CustomerOrderDetailPage({
  params,
}: CustomerOrderDetailPageProps) {
  const { store_slug: storeSlug, orderId } = await params;
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountPath = getStoreCustomerAccountPath(store.slug, "cuenta");

  if (!user) {
    redirect(
      buildCustomerRegisterPath(
        store.slug,
        `${accountPath}/${encodeURIComponent(orderId)}`,
      ),
    );
  }

  const order = await getCustomerOrderForStore(store.id, orderId);
  if (!order) notFound();

  return (
    <div className="catalog-subpage">
      <div className="card-panel">
        <CustomerOrderDetail
          storeSlug={store.slug}
          storeId={store.id}
          userId={user.id}
          order={order}
        />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href={getStoreCatalogBasePath(store.slug)} className="link-brand">
          Seguir comprando
        </Link>
      </p>
    </div>
  );
}
