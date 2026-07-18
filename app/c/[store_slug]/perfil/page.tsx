import { notFound, redirect } from "next/navigation";
import { CustomerProfilePanel } from "@/components/customers/CustomerProfilePanel";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
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
    redirect(buildCustomerRegisterPath(store.slug, `/c/${store.slug}/perfil`));
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("display_name, phone")
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .maybeSingle();

  return (
    <div className="catalog-subpage">
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">Perfil</h1>
        <p className="catalog-subpage-desc">
          Tus datos de contacto en {store.name}.
        </p>
      </header>

      <CustomerProfilePanel
        storeSlug={store.slug}
        storeName={store.name}
        email={user.email ?? null}
        displayName={profile?.display_name ?? null}
        phone={profile?.phone ?? null}
      />
    </div>
  );
}
