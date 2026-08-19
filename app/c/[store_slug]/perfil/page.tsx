import { notFound, redirect } from "next/navigation";
import { CustomerProfilePanel } from "@/components/customers/CustomerProfilePanel";
import { StorefrontAccountChrome } from "@/components/catalog-transactional/StorefrontAccountChrome";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getPublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import {
  resolveCustomerAuthMethod,
  resolveCustomerContactEmail,
} from "@/lib/customers/phone-auth";
import { resolveCustomerPasswordCapability } from "@/lib/customers/resolve-customer-password-capability";
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

  const [profileResult, catalogData, passwordCapability, themeContext] =
    await Promise.all([
      supabase
        .from("customer_profiles")
        .select(
          "display_name, phone, delivery_address, preferred_shipping_method, preferred_shipping_branch_name",
        )
        .eq("user_id", user.id)
        .eq("store_id", store.id)
        .maybeSingle(),
      getPublicCatalogPageData(store.slug),
      resolveCustomerPasswordCapability(user),
      getPublicCatalogThemeContext(store.slug),
    ]);

  const profile = profileResult.data;
  const whatsappPhone = catalogData?.purchaseInfo.whatsappPhone ?? "";

  return (
    <StorefrontAccountChrome
      storeSlug={store.slug}
      storeName={store.name}
      logoUrl={store.logo_url}
      primaryColor={themeContext?.catalogDesign.primaryColor ?? null}
      eyebrow="Mi perfil"
      className="txn-catalog txn-catalog--moriche-native"
      style={themeContext?.style}
    >
      <div className="catalog-subpage !px-0 !py-0">
        <header className="catalog-subpage-header !px-0">
          <h1 className="catalog-subpage-title">Mi perfil</h1>
          <p className="catalog-subpage-desc">
            Actualiza tu contacto y seguridad en {store.name}. Los cambios se
            usan al autocompletar el checkout.
          </p>
        </header>

        <CustomerProfilePanel
          storeSlug={store.slug}
          storeName={store.name}
          contactEmail={resolveCustomerContactEmail(
            user.email,
            user.user_metadata,
          )}
          loginMethod={resolveCustomerAuthMethod(user.email)}
          canChangePassword={passwordCapability.canChangePassword}
          externalAuthProviderLabel={passwordCapability.externalProviderLabel}
          displayName={profile?.display_name ?? null}
          phone={profile?.phone ?? null}
          deliveryAddress={(profile?.delivery_address as string | null) ?? null}
          preferredShippingMethod={
            (profile?.preferred_shipping_method as string | null) ?? null
          }
          preferredShippingBranchName={
            (profile?.preferred_shipping_branch_name as string | null) ?? null
          }
          whatsappPhone={whatsappPhone}
        />
      </div>
    </StorefrontAccountChrome>
  );
}
