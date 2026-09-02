import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrdersList } from "@/components/customers/CustomerOrdersList";
import { CustomerGiftCardWallet } from "@/components/customers/CustomerGiftCardWallet";
import { StorefrontAccountChrome } from "@/components/catalog-transactional/StorefrontAccountChrome";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { getCustomerOrdersForStore } from "@/lib/customers/get-customer-orders";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
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

  const [orders, catalogData, themeContext] = await Promise.all([
    getCustomerOrdersForStore(store.id),
    getPublicCatalogPageData(store.slug),
    getPublicCatalogThemeContext(store.slug),
  ]);
  const storeWhatsAppPhone =
    catalogData?.purchaseInfo.whatsappPhone?.trim() ||
    catalogData?.purchaseInfo.whatsappPhones.find((phone) => phone.trim())?.trim() ||
    null;

  return (
    <StorefrontAccountChrome
      storeSlug={store.slug}
      storeName={store.name}
      logoUrl={store.logo_url}
      primaryColor={themeContext?.catalogDesign.primaryColor ?? null}
      eyebrow="Mis compras"
      className="txn-catalog txn-catalog--moriche-native"
      style={themeContext?.style}
    >
      <div className="catalog-subpage !px-0 !py-0">
        <header className="catalog-subpage-header !px-0">
          <h1 className="catalog-subpage-title">Mis compras</h1>
          <p className="catalog-subpage-desc">
            Consulta tu saldo a favor, canjea tarjetas de regalo y revisa el
            estado de tus pedidos en {store.name}.
          </p>
        </header>

        <div className="mb-6">
          <CustomerGiftCardWallet storeSlug={store.slug} />
        </div>

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
    </StorefrontAccountChrome>
  );
}
