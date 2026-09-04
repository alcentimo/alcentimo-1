import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrderDetail } from "@/components/customers/CustomerOrderDetail";
import { StorefrontAccountChrome } from "@/components/catalog-transactional/StorefrontAccountChrome";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { getCustomerOrderForStore } from "@/lib/customers/get-customer-orders";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import { getPublicStoreBySlug } from "@/lib/stores";
import { resolveStoreLogoUrl } from "@/lib/stores/logo-url";
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

  const [order, catalogData, themeContext] = await Promise.all([
    getCustomerOrderForStore(store.id, orderId),
    getPublicCatalogPageData(store.slug),
    getPublicCatalogThemeContext(store.slug),
  ]);
  if (!order) notFound();

  const storeWhatsAppPhone =
    catalogData?.purchaseInfo.whatsappPhone?.trim() ||
    catalogData?.purchaseInfo.whatsappPhones
      .find((phone) => phone.trim())
      ?.trim() ||
    null;

  return (
    <StorefrontAccountChrome
      storeSlug={store.slug}
      storeName={store.name}
      logoUrl={resolveStoreLogoUrl(store)}
      primaryColor={themeContext?.catalogDesign.primaryColor ?? null}
      eyebrow="Pedido"
      className="txn-catalog txn-catalog--moriche-native"
      style={themeContext?.style}
    >
      <div className="catalog-subpage !px-0 !py-0">
        <div className="card-panel">
          <CustomerOrderDetail
            storeSlug={store.slug}
            storeId={store.id}
            userId={user.id}
            order={order}
            storeWhatsAppPhone={storeWhatsAppPhone}
          />
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link
            href={getStoreCatalogBasePath(store.slug)}
            className="link-brand"
          >
            Seguir comprando
          </Link>
        </p>
      </div>
    </StorefrontAccountChrome>
  );
}
