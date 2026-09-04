import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerRegisterPanel } from "@/components/customers/CustomerRegisterPanel";
import { StorefrontAccountChrome } from "@/components/catalog-transactional/StorefrontAccountChrome";
import {
  buildCustomerAccountPath,
  userIsCustomerOfStoreId,
  userIsMerchantOfStoreSlug,
} from "@/lib/customers/middleware-access";
import { resolveCustomerStoreSlugFromNext } from "@/lib/customers/ensure-customer-profile";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { getPublicStoreBySlug } from "@/lib/stores";
import { resolveStoreLogoUrl } from "@/lib/stores/logo-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CatalogRegisterPageProps {
  params: Promise<{ store_slug: string }>;
  searchParams: Promise<{
    next?: string;
    complete?: string;
    orderId?: string;
  }>;
}

function resolveNextPath(storeSlug: string, nextParam?: string): string {
  const fallback = buildCustomerAccountPath(storeSlug);
  if (!nextParam?.startsWith("/") || nextParam.startsWith("//")) {
    return fallback;
  }

  const resolvedSlug = resolveCustomerStoreSlugFromNext(nextParam, storeSlug);
  if (resolvedSlug !== storeSlug) {
    return fallback;
  }

  return nextParam.split("?")[0] ?? fallback;
}

function resolveSuggestedDisplayName(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (metadata && typeof metadata.display_name === "string") {
    const value = metadata.display_name.trim();
    if (value.length >= 2) return value;
  }

  if (metadata && typeof metadata.full_name === "string") {
    const value = metadata.full_name.trim();
    if (value.length >= 2) return value;
  }

  return null;
}

export default async function CatalogRegisterPage({
  params,
  searchParams,
}: CatalogRegisterPageProps) {
  const { store_slug: storeSlugParam } = await params;
  const storeSlug = storeSlugParam.trim().toLowerCase();
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) notFound();

  const query = await searchParams;
  const nextPath = resolveNextPath(store.slug, query.next);
  const needsPhoneCompletion = query.complete === "phone";
  const orderId = query.orderId?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let suggestedDisplayName: string | null = null;

  // Buyers no longer complete dropshipper-style verification on the storefront.
  // Legacy Google links with `?complete=phone` go straight to the account.
  if (needsPhoneCompletion) {
    if (!user) {
      redirect(`${getStoreCatalogBasePath(store.slug)}/registro`);
    }
    redirect(nextPath);
  }

  if (user) {
    const [isCustomer, isMerchant] = await Promise.all([
      userIsCustomerOfStoreId(supabase, user.id, store.id),
      userIsMerchantOfStoreSlug(supabase, user.id, store.slug),
    ]);

    if (isCustomer) {
      redirect(nextPath);
    }

    if (isMerchant) {
      redirect(getStoreCatalogBasePath(store.slug));
    }

    suggestedDisplayName = resolveSuggestedDisplayName(user.user_metadata);
  }

  const themeContext = await getPublicCatalogThemeContext(store.slug);

  return (
    <StorefrontAccountChrome
      storeSlug={store.slug}
      storeName={store.name}
      logoUrl={resolveStoreLogoUrl(store)}
      primaryColor={themeContext?.catalogDesign.primaryColor ?? null}
      eyebrow="Crear cuenta"
      className="txn-catalog txn-catalog--moriche-native"
      style={themeContext?.style}
    >
      <div className="catalog-subpage txn-catalog-subpage !px-0 !py-0">
        <header className="catalog-subpage-header !px-0">
          <h1 className="catalog-subpage-title">Crear cuenta</h1>
          <p className="catalog-subpage-desc">
            Regístrate en {store.name} con tu nombre, correo y contraseña.
          </p>
        </header>

        <CustomerRegisterPanel
          storeSlug={store.slug}
          storeName={store.name}
          nextPath={nextPath}
          suggestedDisplayName={suggestedDisplayName}
          orderId={orderId}
          variant="catalog"
        />

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link
            href={getStoreCatalogBasePath(store.slug)}
            className="link-brand"
          >
            ← Volver al catálogo
          </Link>
        </p>
      </div>
    </StorefrontAccountChrome>
  );
}
