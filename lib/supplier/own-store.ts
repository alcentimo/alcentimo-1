import "server-only";

import { redirect } from "next/navigation";
import type { Store } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STORE_COUNTRY } from "@/lib/onboarding/countries";
import { DEFAULT_STORE_RUBRO } from "@/src/config/categories";
import {
  defaultStoreSettingsConfig,
  mergeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { getUserStore } from "@/lib/stores";
import { scheduleStoreSubdomainProvision } from "@/lib/domains/provision-store-subdomain";
import { syncStoreProductCategories } from "@/lib/products/rubro-categories";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { syncSupplierOwnStoreCatalog } from "@/lib/supplier/own-store-sync";
import { SUPPLIER_OWN_STORE_NAV_PREFIX } from "@/src/config/dashboard-nav";
import { SUPPLIER_LOGIN_PATH } from "@/lib/landing/supplier-zone-href";

export { lookupSupplierOwnStorefrontByUserId } from "@/lib/supplier/own-storefront-flag";

export async function userHasSupplierOwnStorefront(
  userId: string,
): Promise<boolean> {
  if (!userId.trim()) return false;
  const storefront = await getSupplierPublicStorefront(userId);
  return storefront?.showPublicCatalog === true;
}

export async function isOwnBrandStore(storeId: string): Promise<boolean> {
  try {
    const settings = await getStoreSettingsConfig(storeId);
    return settings.ownBrandStore === true;
  } catch {
    return false;
  }
}

/**
 * Crea o reutiliza la tienda del proveedor con vitrina pública.
 * El slug coincide con public_catalog_slug para reutilizar /c/{slug}.
 */
export async function ensureSupplierOwnStore(
  userId: string,
): Promise<Store | null> {
  const storefront = await getSupplierPublicStorefront(userId);
  if (!storefront?.showPublicCatalog) return null;

  const admin = createAdminClient();
  const supabase = await createClient();
  const existing = await getUserStore(supabase, userId);

  const desiredSlug =
    storefront.publicCatalogSlug?.trim().toLowerCase() || null;
  const name = (storefront.tradeName || storefront.companyName || "Mi tienda")
    .trim()
    .slice(0, 80);

  let store = existing;

  if (!store) {
    const slug = desiredSlug || `proveedor-${userId.replace(/-/g, "").slice(0, 12)}`;
    const { data, error } = await admin
      .from("stores")
      .insert({
        owner_id: userId,
        name,
        slug,
        description: storefront.description || null,
        logo_url: storefront.logoUrl,
        country: DEFAULT_STORE_COUNTRY,
        rubro_tienda: DEFAULT_STORE_RUBRO,
        is_active: true,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[ensureSupplierOwnStore] insert", error?.message);
      return null;
    }
    store = data as Store;
    scheduleStoreSubdomainProvision({ storeId: store.id, slug: store.slug });
    await syncStoreProductCategories(admin, store.id, DEFAULT_STORE_RUBRO);
  } else {
    const patch: Record<string, unknown> = {
      name,
      description: storefront.description || store.description,
      logo_url: storefront.logoUrl ?? store.logo_url,
      updated_at: new Date().toISOString(),
    };
    if (
      desiredSlug &&
      desiredSlug !== store.slug &&
      !(await slugTakenByOtherStore(admin, desiredSlug, store.id))
    ) {
      patch.slug = desiredSlug;
    }
    const { data: updated } = await admin
      .from("stores")
      .update(patch)
      .eq("id", store.id)
      .select("*")
      .maybeSingle();
    if (updated) store = updated as Store;
  }

  let current = defaultStoreSettingsConfig();
  try {
    current = await getStoreSettingsConfig(store.id);
  } catch {
    current = defaultStoreSettingsConfig();
  }
  const merged = mergeStoreSettingsConfig(current, {
    ownBrandStore: true,
    shipping: storefront.shipping,
    payments: storefront.payments,
    dropshipPricing: {
      ...current.dropshipPricing,
      enabled: false,
    },
  });

  const { error: settingsError } = await admin.from("store_settings").upsert(
    { store_id: store.id, config: merged },
    { onConflict: "store_id" },
  );
  if (settingsError && settingsError.code !== "23505") {
    console.warn("[ensureSupplierOwnStore] settings", settingsError.message);
  }

  try {
    await syncSupplierOwnStoreCatalog({
      admin,
      store,
      supplierUserId: userId,
    });
  } catch (caught) {
    console.warn(
      "[ensureSupplierOwnStore] catalog-sync",
      caught instanceof Error ? caught.message : caught,
    );
  }

  return store;
}

export async function mirrorSupplierProductToOwnStore(
  userId: string,
  supplierProductId?: string,
): Promise<void> {
  try {
    const store = await ensureSupplierOwnStore(userId);
    if (!store) return;
    await syncSupplierOwnStoreCatalog({
      store,
      supplierUserId: userId,
      supplierProductId,
    });
  } catch (caught) {
    console.warn(
      "[mirrorSupplierProductToOwnStore]",
      caught instanceof Error ? caught.message : caught,
    );
  }
}

async function slugTakenByOtherStore(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
  storeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .neq("id", storeId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function requireSupplierHubSession(input?: {
  requireOwnStorefront?: boolean;
}): Promise<{
  user: { id: string };
  storefront: Awaited<ReturnType<typeof getSupplierPublicStorefront>>;
  store: Store | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${SUPPLIER_LOGIN_PATH}?next=${SUPPLIER_OWN_STORE_NAV_PREFIX}`);
  }

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    user,
  });
  if (!access.ok) {
    redirect(`/proveedor/registro?error=${access.reason ?? "denied"}`);
  }

  const storefront = await getSupplierPublicStorefront(user.id);
  if (input?.requireOwnStorefront && !storefront?.showPublicCatalog) {
    redirect("/proveedor/dashboard");
  }

  const store =
    storefront?.showPublicCatalog === true
      ? await ensureSupplierOwnStore(user.id)
      : null;

  return { user: { id: user.id }, storefront, store };
}
