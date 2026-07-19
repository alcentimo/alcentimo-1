import { notFound, redirect } from "next/navigation";
import { CustomerProfilePanel } from "@/components/customers/CustomerProfilePanel";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { resolveCustomerContactEmail } from "@/lib/customers/phone-auth";
import { getPublicStoreBySlug } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CustomerProfilePageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function CustomerProfilePage({
  params,
}: CustomerProfilePageProps) {
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
        getStoreCustomerAccountPath(store.slug, "perfil"),
      ),
    );
  }

  const [profileResult, catalogData] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("display_name, phone")
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle(),
    getPublicCatalogPageData(store.slug),
  ]);

  const profile = profileResult.data;
  const whatsappPhone = catalogData?.purchaseInfo.whatsappPhone ?? "";

  return (
    <div className="catalog-subpage">
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Perfil</h1>
        <p className="catalog-subpage-desc">
          Actualiza tus datos en {store.name}.
        </p>
      </header>

      <CustomerProfilePanel
        storeSlug={store.slug}
        storeName={store.name}
        contactEmail={resolveCustomerContactEmail(user.email, user.user_metadata)}
        displayName={profile?.display_name ?? null}
        phone={profile?.phone ?? null}
        whatsappPhone={whatsappPhone}
      />
    </div>
  );
}
