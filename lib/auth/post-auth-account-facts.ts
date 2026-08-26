import { createAdminClient } from "@/lib/supabase/admin";
import { buildCustomerAccountPath } from "@/lib/customers/middleware-access";
import { lookupSupplierStoreModeByUserId } from "@/lib/supplier/own-storefront-flag";
import { shouldForceSupplierPostAuthRedirect } from "@/lib/supplier/access";
import type { PostLoginAccountFacts } from "@/lib/auth/post-auth-redirect";

async function lookupHasMerchantStore(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: owned } = await db
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();
    if (owned?.id) return true;

    const { data: membership } = await db
      .from("store_members")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    return Boolean(membership?.id);
  } catch {
    return false;
  }
}

async function lookupCustomerAccountPath(
  userId: string,
): Promise<string | null> {
  if (!userId.trim()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: profile } = await db
      .from("customer_profiles")
      .select("store_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!profile?.store_id) return null;

    const { data: store } = await db
      .from("stores")
      .select("slug")
      .eq("id", profile.store_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!store?.slug) return null;
    return buildCustomerAccountPath(String(store.slug));
  } catch {
    return null;
  }
}

/** Hechos de cuenta vía admin (sin cookies de sesión). */
export async function loadPostAuthAccountFacts(input: {
  userId: string;
  email?: string | null;
  next?: string | null;
  intent?: PostLoginAccountFacts["intent"];
}): Promise<PostLoginAccountFacts> {
  const userId = input.userId;

  const [isSupplier, hasMerchantStore, supplierStoreMode, customerAccountPath] =
    await Promise.all([
      shouldForceSupplierPostAuthRedirect({
        email: input.email ?? null,
        userId,
      }),
      lookupHasMerchantStore(userId),
      lookupSupplierStoreModeByUserId(userId),
      lookupCustomerAccountPath(userId),
    ]);

  return {
    next: input.next ?? null,
    intent: input.intent ?? null,
    isSupplier,
    hasMerchantStore,
    supplierStoreMode,
    customerAccountPath,
  };
}
