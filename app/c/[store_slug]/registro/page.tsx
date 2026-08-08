import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerRegisterPanel } from "@/components/customers/CustomerRegisterPanel";
import {
  buildCustomerAccountPath,
  userIsCustomerOfStoreId,
  userIsMerchantOfStoreSlug,
} from "@/lib/customers/middleware-access";
import { resolveCustomerStoreSlugFromNext } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { getPublicStoreBySlug } from "@/lib/stores";
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

  if (user) {
    const [isCustomer, isMerchant] = await Promise.all([
      userIsCustomerOfStoreId(supabase, user.id, store.id),
      userIsMerchantOfStoreSlug(supabase, user.id, store.slug),
    ]);

    if (isCustomer && !needsPhoneCompletion) {
      redirect(nextPath);
    }

    if (isMerchant && !needsPhoneCompletion) {
      redirect(getStoreCatalogBasePath(store.slug));
    }
  }

  if (needsPhoneCompletion) {
    if (!user) {
      redirect(`${getStoreCatalogBasePath(store.slug)}/registro`);
    }

    suggestedDisplayName = resolveSuggestedDisplayName(user.user_metadata);

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("phone")
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle();

    if (profile?.phone && isValidCustomerPhone(profile.phone)) {
      redirect(nextPath);
    }
  }

  return (
    <div className="catalog-subpage txn-catalog-subpage">
      <header className="catalog-subpage-header">
        <h1 className="catalog-subpage-title">
          {needsPhoneCompletion ? "¿Agregar WhatsApp?" : "Crear cuenta"}
        </h1>
        <p className="catalog-subpage-desc">
          {needsPhoneCompletion
            ? `Puedes agregar tu WhatsApp para pedidos en ${store.name}, o continuar sin número.`
            : `Regístrate en ${store.name} con Google o con correo y contraseña.`}
        </p>
      </header>

      <CustomerRegisterPanel
        storeSlug={store.slug}
        storeName={store.name}
        nextPath={nextPath}
        needsPhoneCompletion={needsPhoneCompletion}
        suggestedDisplayName={suggestedDisplayName}
        orderId={orderId}
        variant="catalog"
      />

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href={getStoreCatalogBasePath(store.slug)} className="link-brand">
          ← Volver al catálogo
        </Link>
      </p>
    </div>
  );
}
